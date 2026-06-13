import { NextRequest, NextResponse } from 'next/server'
import { isFreeTierOnly, buildQuickCutProviderConfig, allowElevenLabsVoice, getElevenLabsApiKey } from '@/lib/ai/free-tier'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MAX_VIDEO_DURATION_SEC, logError } from '@/lib/workspace/validation'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { generateVoice } from '@/lib/voice/generateVoice'
import { selectVoiceProfile } from '@/lib/voice/voiceProfiles'
import { normalizeGenerationMode } from '@/lib/economics/generation-mode'
import { resolveProviderRouting, shouldUseElevenLabsVoice } from '@/lib/economics/provider-routing.server'
import { resolveUserPlanType } from '@/lib/economics/resolve-user-plan.server'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseSceneBlueprints } from '@/lib/cinematic/scene-blueprint'
import {
  VOICE_PROVIDER_MISSING_MESSAGE,
  VOICE_UNAVAILABLE_MESSAGE,
} from '@/lib/generation/generation-pipeline-messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseScenes(raw: unknown): GeneratedScene[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s) => s && typeof s === 'object') as GeneratedScene[]
}

function isVoiceProviderConfigured(providers: ReturnType<typeof buildQuickCutProviderConfig>): boolean {
  return Boolean(providers.elevenlabs || providers.openai || providers.emergent)
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

    const providers = buildQuickCutProviderConfig()
    const voiceConfigured = isVoiceProviderConfigured(providers)

    if (!voiceConfigured) {
      const message = isFreeTierOnly()
        ? 'Voice generation requires OPENAI_API_KEY (tts-1) in free tier.'
        : VOICE_PROVIDER_MISSING_MESSAGE
      console.warn('[voice] provider unavailable', {
        reason: 'VOICE_PROVIDER_UNAVAILABLE',
        freeTierOnly: providers.freeTierOnly,
      })
      return NextResponse.json(
        {
          skipped: true,
          reason: 'VOICE_PROVIDER_UNAVAILABLE',
          error: message,
          audioUrl: null,
          mock: true,
          fallbackMessage: VOICE_UNAVAILABLE_MESSAGE,
        },
        { status: 200 }
      )
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const generationMode = normalizeGenerationMode(raw?.generationMode ?? raw?.generation_mode)
    const planType = user ? await resolveUserPlanType(user.id) : 'FREE'
    const voicePolicy = resolveProviderRouting({ generationMode, planType })
    const preferElevenLabs =
      shouldUseElevenLabsVoice(voicePolicy) &&
      allowElevenLabsVoice() &&
      Boolean(getElevenLabsApiKey())

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
        preferElevenLabs,
      },
      supabase
    )

    if (!result.buffer && !result.audioUrl) {
      const message =
        result.fallbackMessage ??
        (isFreeTierOnly()
          ? 'Voice generation requires OPENAI_API_KEY (tts-1) in free tier, or runs without audio.'
          : VOICE_PROVIDER_MISSING_MESSAGE)
      console.warn('[voice] synthesis unavailable', {
        reason: 'VOICE_SYNTHESIS_FAILED',
        provider: result.provider,
        mock: result.mock,
      })
      return NextResponse.json(
        {
          skipped: true,
          reason: 'VOICE_SYNTHESIS_FAILED',
          error: message,
          audioUrl: null,
          mock: true,
          waveform: result.waveform,
          provider: result.provider,
          fallbackMessage: result.fallbackMessage ?? VOICE_UNAVAILABLE_MESSAGE,
          voiceMetadata: result.voiceMetadata,
        },
        { status: 200 }
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

    if (user) {
      void trackMp4ExportServer({
        event: Mp4ExportEvents.VOICE_GENERATED,
        userId: user.id,
        page: '/api/generate-voice',
        metadata: {
          projectId: parseFeatureUsageProjectId(raw),
          provider: result.provider ?? 'unknown',
          duration_sec: durationSec,
          mock: result.mock ?? false,
        },
      })
    }

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
    console.warn('[voice] generation error', {
      reason: 'VOICE_ROUTE_ERROR',
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        skipped: true,
        reason: 'VOICE_ROUTE_ERROR',
        error: 'Voice generation paused',
        audioUrl: null,
        fallbackMessage: VOICE_UNAVAILABLE_MESSAGE,
      },
      { status: 500 }
    )
  }
}
