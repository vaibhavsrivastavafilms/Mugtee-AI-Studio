// MUGTEE V2.1 — Voiceover generation endpoint.
//
// POST /api/ai/voice
// body: { project_id: uuid, script: string, voice_id?: string, model_id?: string }
//
// Strategy:
//   - If ELEVENLABS_API_KEY is configured → generate MP3 via ElevenLabs TTS, upload to
//     Supabase Storage, insert project_assets row, return { url, kind:'voiceover' }.
//   - If no key → return 200 with { ok: true, fallback: 'browser', script } so the
//     frontend uses browser SpeechSynthesis. We still insert a project_assets row
//     with kind='voiceover' and metadata.fallback='browser' so it appears in the
//     Library Voiceovers tab with the saved script (replay = re-read aloud).
//
// EXTREME LOW CREDIT MODE: no SDKs.

import { NextRequest, NextResponse } from 'next/server'
import { getElevenLabsApiKey } from '@/lib/ai/free-tier'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ELEVEN_KEY = getElevenLabsApiKey()
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // "Rachel" — cinematic
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5'
const BUCKET = 'project-assets'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const projectId = String(body?.project_id || '').trim()
    const script    = String(body?.script || '').trim()
    const voiceId   = String(body?.voice_id || DEFAULT_VOICE)
    const modelId   = String(body?.model_id || DEFAULT_MODEL)

    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    if (!script)    return NextResponse.json({ error: 'script required' }, { status: 400 })
    if (script.length > 4500) {
      return NextResponse.json({ error: 'Script too long (max 4500 chars). Trim it first.' }, { status: 400 })
    }

    const { data: piece } = await supabase
      .from('content_pieces').select('id, title, user_id').eq('id', projectId).single()
    if (!piece || piece.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // ---- No ElevenLabs key → record a "browser fallback" voiceover entry ----
    if (!ELEVEN_KEY) {
      const { data: row } = await supabase.from('project_assets').insert({
        project_id: projectId,
        user_id: user.id,
        kind: 'voiceover',
        url: null,
        storage_path: null,
        mime_type: 'text/plain',
        title: piece.title || null,
        prompt: script,
        metadata: { fallback: 'browser', model: 'browser-speech-synthesis', voice_id: voiceId },
      }).select('id, url, kind, prompt, metadata, created_at').single()
      return NextResponse.json({ ok: true, fallback: 'browser', asset: row })
    }

    // ---- ElevenLabs TTS → MP3 → storage ----
    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: script,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
      }),
    })
    if (!elRes.ok) {
      const errText = await elRes.text().catch(() => '')
      console.error('[voice] ElevenLabs error:', elRes.status, errText.slice(0, 300))
      return NextResponse.json({ error: 'TTS provider error', detail: errText.slice(0, 300) }, { status: 502 })
    }
    const arrayBuffer = await elRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `${user.id}/${projectId}/voice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(filename, buffer, { contentType: 'audio/mpeg', upsert: false })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    const { data: row, error: rowErr } = await supabase.from('project_assets').insert({
      project_id: projectId,
      user_id: user.id,
      kind: 'voiceover',
      url: pub.publicUrl,
      storage_path: filename,
      mime_type: 'audio/mpeg',
      title: piece.title || null,
      prompt: script,
      metadata: { provider: 'elevenlabs', voice_id: voiceId, model_id: modelId },
    }).select('id, url, kind, prompt, metadata, created_at').single()
    if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, asset: row })
  } catch (e: any) {
    console.error('[voice] unexpected:', e?.message)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
