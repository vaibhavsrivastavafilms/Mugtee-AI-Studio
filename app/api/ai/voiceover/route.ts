// MUGTEE V4.3 — Cinematic Voiceover endpoint (Phase 3B).
//
// POST /api/ai/voiceover
// body: { script: string, voice_style?: 'warm_documentary' | 'emotional_cinematic' | 'deep_trailer' | 'calm_storyteller',
//         platform?: string, duration?: number, mood?: string }
//
// Pipeline (single call):
//   1. Auth check (must be signed in).
//   2. Ask the LLM to rewrite the script into short cinematic NARRATION text
//      (single short paragraph, reflective, documentary-quality). Pacing context
//      from platform + duration is folded into the system prompt.
//   3. Synthesize narration → MP3 via OpenAI TTS (through the Emergent gateway).
//   4. Return { narration, audio: base64 data URI, voice }.
//
// EXTREME LOW CREDIT: raw fetch only, no SDKs, no persistence layer. Frontend
// is responsible for caching the result in localStorage if it wants to.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  emotionalNarrationSystemPrompt,
  prepareCinematicVoiceover,
} from '@/lib/cinematic/execution/cinematic-voice-engine'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { coerceDuration } from '@/lib/workspace/validation'
import { generateVoice } from '@/lib/voice/generateVoice'
import { parseSceneBlueprints } from '@/lib/cinematic/scene-blueprint'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const CHAT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'

// 4 cinematic voice presets (per spec).
// Maps each style to: the OpenAI TTS voice + a short LLM persona prefix that
// steers the narration tone. Voices: alloy / echo / fable / onyx / nova / shimmer.
const VOICE_STYLES: Record<string, { voice: string; persona: string; label: string }> = {
  warm_documentary: {
    voice: 'onyx',
    label: 'Warm Documentary',
    persona: 'Speak like a calm, reflective documentary narrator. Honest, warm, unhurried.',
  },
  emotional_cinematic: {
    voice: 'echo',
    label: 'Emotional Cinematic',
    persona: 'Speak like a cinematic voiceover artist with lyrical, emotional pacing. Soft restraint, never theatrical.',
  },
  deep_trailer: {
    voice: 'onyx',
    label: 'Deep Trailer',
    persona: 'Speak like a film trailer narrator. Weighty, deliberate, sparse. Each line lands.',
  },
  calm_storyteller: {
    voice: 'fable',
    label: 'Calm Storyteller',
    persona: 'Speak like a gentle bedtime storyteller. Soft, intimate, patient cadence.',
  },
}

function categorize(status: number, sample: string): { code: string; label: string } {
  const s = sample.toLowerCase()
  if (status === 401 || status === 403 || s.includes('unauthor') || s.includes('invalid api key')) {
    return { code: 'auth_failed', label: 'Voice could not connect — try again' }
  }
  if (status === 429 || s.includes('quota') || s.includes('rate limit')) {
    return { code: 'quota_exceeded', label: 'Voice is resting — try again shortly' }
  }
  if (status === 404 || s.includes('not found') || s.includes('invalid model')) {
    return { code: 'invalid_model', label: 'Voice tone unavailable — try another mood' }
  }
  if (status === 408 || status === 504 || s.includes('timeout')) {
    return { code: 'timeout', label: 'Voice took too long — your script is preserved' }
  }
  if (status >= 500) {
    return { code: 'provider_unavailable', label: 'Voice is resting — try again shortly' }
  }
  return { code: 'provider_error', label: 'Voice could not settle — try again' }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to hear your story' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const script: string = String(body?.script || '').trim()
    if (!script || script.length < 20) {
      return NextResponse.json(
        { error: 'Script needs more breath before voice can settle' },
        { status: 400 }
      )
    }
    const styleId: string = String(body?.voice_style || 'warm_documentary')
    const style = VOICE_STYLES[styleId] || VOICE_STYLES.warm_documentary

    if (!EMERGENT_LLM_KEY) {
      const narration = script
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .slice(0, 4)
        .join(' ')
        .slice(0, 600)
        .trim()
      return NextResponse.json({
        narration: narration || script.slice(0, 400),
        audio: '',
        voice: style.voice,
        voice_style: styleId,
        voice_label: style.label,
        fallback: 'browser',
        mock: true,
      })
    }
    const platform: string = String(body?.platform || 'instagram_reel')
    const duration = coerceDuration(body?.duration)
    const moodLabel: string = String(body?.mood || '').trim()
    const cinematicOutput = body?.cinematic_output as CinematicGenerationOutput | undefined
    const hasCinematicPacing = Boolean(
      cinematicOutput?.scenes?.length && cinematicOutput.scenes.length >= 2
    )

    let sourceScript = script
    let targetWords = Math.max(40, Math.min(220, Math.round(duration * 2.4)))
    let pacingDirection = ''

    if (hasCinematicPacing && cinematicOutput) {
      const prepared = prepareCinematicVoiceover(
        script,
        cinematicOutput,
        styleId,
        duration
      )
      pacingDirection = prepared.direction
      targetWords = Math.max(
        40,
        Math.min(220, Math.round((prepared.targetWpm * duration) / 60))
      )
    }

    // ----- 1. Rewrite the script into short cinematic narration -----
    const sys = [
      'You are Mugtee — a cinematic voiceover writer.',
      'Convert a creator\u2019s script into a single short narration paragraph designed to be SPOKEN aloud, not read.',
      style.persona,
      pacingDirection
        ? emotionalNarrationSystemPrompt(styleId, pacingDirection, targetWords)
        : '',
      'Constraints:',
      `• Length: aim for ~${targetWords} spoken words (no exact count needed). Total runtime ~${duration}s on the selected platform (${platform}).`,
      '• No emojis, no hashtags, no scene labels, no formatting marks.',
      '• Use real human cadence: short sentences, natural pauses indicated by line breaks, no AI filler.',
      '• Preserve specific imagery from the script. Cut summary, motivational filler, and rhetorical questions.',
      '• Never narrate stage directions. Speak only the words a voice actor would say.',
      moodLabel ? `• Honor the cinematic mood: ${moodLabel}.` : '',
    ].filter(Boolean).join('\n')

    const chatRes = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_LLM_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Source script:\n\n${sourceScript.slice(0, 6000)}\n\nWrite the spoken narration only.` },
        ],
      }),
    })
    if (!chatRes.ok) {
      const t = await chatRes.text().catch(() => '')
      const cat = categorize(chatRes.status, t)
      console.error('[voiceover] text-gen failed', { status: chatRes.status, code: cat.code, sample: t.slice(0, 300) })
      return NextResponse.json({ error: cat.label, code: cat.code }, { status: 502 })
    }
    const chatJson: any = await chatRes.json().catch(() => ({}))
    const narration: string = (chatJson?.choices?.[0]?.message?.content || '').trim()
    if (!narration) {
      console.error('[voiceover] empty narration', { keys: Object.keys(chatJson || {}) })
      return NextResponse.json({ error: 'Narration could not take form — try again' }, { status: 502 })
    }

    // ----- 2. Synthesize narration → MP3 via Voice Director (ElevenLabs → TTS fallback) -----
    const projectId = String(body?.project_id || '').trim()
    const voiceResult = await generateVoice(
      {
        script: narration,
        userId: user.id,
        projectId: projectId || undefined,
        tone: styleId,
        niche: cinematicOutput?.niche,
        scenes: cinematicOutput?.scenes ?? [],
        sceneBlueprints: parseSceneBlueprints(
          (body as Record<string, unknown>)?.sceneBlueprints ??
            (body as Record<string, unknown>)?.scene_blueprints
        ),
        skipCache: false,
      },
      supabase
    )

    const audioBuf = voiceResult.buffer
    if (!audioBuf || audioBuf.length < 200) {
      if (!voiceResult.audioUrl) {
        console.error('[voiceover] voice synthesis failed or empty')
        return NextResponse.json({
          narration,
          voice: style.voice,
          voice_style: styleId,
          error: voiceResult.fallbackMessage ?? 'Voice audio empty — narration preserved',
        }, { status: 502 })
      }
    }

    const audioDataUri =
      voiceResult.audioUrl?.startsWith('data:')
        ? voiceResult.audioUrl
        : audioBuf
          ? `data:audio/mpeg;base64,${audioBuf.toString('base64')}`
          : voiceResult.audioUrl ?? ''

    let persistedAsset: unknown = null
    if (projectId && voiceResult.storagePath && voiceResult.audioUrl && !voiceResult.audioUrl.startsWith('data:')) {
      try {
        const { data: piece } = await supabase
          .from('content_pieces')
          .select('id, title, user_id')
          .eq('id', projectId)
          .single()
        if (piece && piece.user_id === user.id) {
          const { data: row, error: rowErr } = await supabase
            .from('project_assets')
            .select('id, url, kind, metadata, created_at')
            .eq('user_id', user.id)
            .contains('metadata', { voice_cache_key: voiceResult.voiceMetadata?.cacheKey })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (!rowErr && row) persistedAsset = row
        }
      } catch (persistErr: unknown) {
        console.warn('[voiceover] persistence soft-fail:', persistErr instanceof Error ? persistErr.message : persistErr)
      }
    }

    return NextResponse.json({
      narration,
      audio: audioDataUri,
      voice: voiceResult.voiceMetadata?.voiceId ?? style.voice,
      voice_style: styleId,
      voice_label: style.label,
      bytes: audioBuf?.length ?? 0,
      provider: voiceResult.provider,
      voiceMetadata: voiceResult.voiceMetadata,
      asset: persistedAsset,
    })
  } catch (e: any) {
    console.error('[voiceover] unexpected error', e?.message)
    return NextResponse.json({ error: 'Voice could not settle — try again' }, { status: 500 })
  }
}
