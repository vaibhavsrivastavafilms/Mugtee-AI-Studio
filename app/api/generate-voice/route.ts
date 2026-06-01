import { NextRequest, NextResponse } from 'next/server'
import { isFreeTierOnly } from '@/lib/ai/free-tier'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MAX_VIDEO_DURATION_SEC, logError } from '@/lib/workspace/validation'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { generateVoice } from '@/lib/voice/generateVoice'
import { selectVoiceProfile } from '@/lib/voice/voiceProfiles'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseSceneBlueprints } from '@/lib/cinematic/scene-blueprint'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseScenes(raw: unknown): GeneratedScene[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s) => s && typeof s === 'object') as GeneratedScene[]
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const script = typeof raw?.script === 'string' ? raw.script : ''
    const niche = typeof raw?.niche === 'string' ? raw.niche : undefined
    const tone = typeof raw?.tone === 'string' ? raw.tone : undefined
    const voiceProfileId =
      typeof raw?.voiceProfileId === 'string' ? raw.voiceProfileId : undefined

    const elevenLabsVoiceId =
      typeof raw?.elevenLabsVoiceId === 'string'
        ? raw.elevenLabsVoiceId.trim()
        : typeof raw?.voice_id === 'string'
          ? raw.voice_id.trim()
          : undefined
    const voiceName =
      typeof raw?.voiceName === 'string' ? raw.voiceName.trim() : undefined

    const profile = voiceProfileId
      ? undefined
      : selectVoiceProfile({ niche, tone })

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const result = await generateVoice(
      {
        script,
        userId: user?.id,
        projectId: parseFeatureUsageProjectId(raw) ?? undefined,
        niche,
        tone,
        voiceProfileId: voiceProfileId ?? profile?.id,
        elevenLabsVoiceId,
        voiceName: voiceName ?? profile?.label,
        scenes: parseScenes(raw?.scenes),
        sceneBlueprints: parseSceneBlueprints(
          raw?.sceneBlueprints ?? raw?.scene_blueprints
        ),
        skipCache: raw?.skipCache === true,
      },
      supabase
    )

    if (!result.buffer && !result.audioUrl) {
      return NextResponse.json(
        {
          error: isFreeTierOnly()
            ? 'Voice generation requires OPENAI_API_KEY (tts-1) in free tier, or runs without audio.'
            : 'Voice generation requires ELEVENLABS_API_KEY, OPENAI_API_KEY, or EMERGENT_LLM_KEY.',
          audioUrl: null,
          mock: true,
          waveform: result.waveform,
          provider: result.provider,
          fallbackMessage: result.fallbackMessage,
          voiceMetadata: result.voiceMetadata,
        },
        { status: 503 }
      )
    }

    if (user) {
      await trackUsageMetric(user.id, 'generations')
      void trackFeatureUsage(
        user.id,
        FeatureUsageFeatures.VOICE_GENERATION,
        parseFeatureUsageProjectId(raw)
      )
    }

    const durationSec =
      result.voiceMetadata?.durationSec ??
      Math.min(MAX_VIDEO_DURATION_SEC, Math.max(15, Math.round(result.narration.length / 14)))

    return NextResponse.json({
      audioUrl: result.audioUrl,
      voiceName: result.voiceMetadata?.voiceName ?? voiceName ?? 'Cinematic Narrator',
      elevenLabsVoiceId: result.voiceMetadata?.voiceId ?? elevenLabsVoiceId ?? null,
      voiceProfileId: result.voiceMetadata?.profileId ?? profile?.id ?? null,
      style: result.voiceMetadata?.profileId ?? 'warm_documentary',
      durationSec,
      waveform: result.waveform,
      mock: result.mock,
      provider: result.provider,
      fallbackMessage: result.fallbackMessage ?? null,
      voiceMetadata: result.voiceMetadata,
      sceneVoiceDirections: result.voiceMetadata?.sceneDirections ?? [],
      fromCache: result.fromCache,
      narration: result.narration,
    })
  } catch (err) {
    logError('generate-voice', err)
    return NextResponse.json({ error: 'Voice generation paused' }, { status: 500 })
  }
}
