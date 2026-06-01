// MUGTEE V2.1 — Voiceover generation endpoint.
//
// POST /api/ai/voice
// body: { project_id: uuid, script: string, voice_id?: string }
//
// Voice Director (lib/voice) → ElevenLabs when configured, OpenAI/Emergent fallback.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateVoice } from '@/lib/voice/generateVoice'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const projectId = String(body?.project_id || '').trim()
    const script = String(body?.script || '').trim()
    const voiceId =
      String(body?.voice_id || body?.elevenLabsVoiceId || '').trim() || undefined

    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 })
    if (script.length > 4500) {
      return NextResponse.json(
        { error: 'Script too long (max 4500 chars). Trim it first.' },
        { status: 400 }
      )
    }

    const { data: piece } = await supabase
      .from('content_pieces')
      .select('id, title, user_id')
      .eq('id', projectId)
      .single()
    if (!piece || piece.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await generateVoice(
      {
        script,
        userId: user.id,
        projectId,
        elevenLabsVoiceId: voiceId,
        niche: typeof body?.niche === 'string' ? body.niche : undefined,
        tone: typeof body?.tone === 'string' ? body.tone : undefined,
      },
      supabase
    )

    if (!result.audioUrl) {
      const { data: row } = await supabase
        .from('project_assets')
        .insert({
          project_id: projectId,
          user_id: user.id,
          kind: 'voiceover',
          url: null,
          storage_path: null,
          mime_type: 'text/plain',
          title: piece.title || null,
          prompt: script,
          metadata: {
            fallback: 'browser',
            model: 'browser-speech-synthesis',
            voice_id: voiceId,
            fallback_message: result.fallbackMessage,
          },
        })
        .select('id, url, kind, prompt, metadata, created_at')
        .single()
      return NextResponse.json({ ok: true, fallback: 'browser', asset: row })
    }

    return NextResponse.json({
      ok: true,
      asset: {
        url: result.audioUrl,
        kind: 'voiceover',
        prompt: result.narration.slice(0, 600),
        metadata: {
          provider: result.provider,
          voice_id: result.voiceMetadata?.voiceId ?? voiceId,
          profile_id: result.voiceMetadata?.profileId,
          voice_cache_key: result.voiceMetadata?.cacheKey,
          storage_path: result.storagePath,
        },
      },
      voiceMetadata: result.voiceMetadata,
      provider: result.provider,
      fallbackMessage: result.fallbackMessage,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[voice] unexpected:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
