import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { generateVoice } from '@/lib/voice/generateVoice'
import { applyVoiceDirectionToBlueprints } from '@/lib/voice/voiceDirector'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseSceneBlueprints } from '@/lib/cinematic/scene-blueprint'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseScenes(raw: unknown): GeneratedScene[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s) => s && typeof s === 'object') as GeneratedScene[]
}

/** Voice-only regeneration — does not touch script, scenes, or storyboard. */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const blocked = await guardUsageLimit(user.id, 'generations')
    if (blocked) return blocked

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const script = typeof raw?.script === 'string' ? raw.script.trim() : ''
    if (!script || script.length < 12) {
      return NextResponse.json({ error: 'Script required for voice regeneration' }, { status: 400 })
    }

    const projectId = parseFeatureUsageProjectId(raw)
    const scenes = parseScenes(raw?.scenes)
    const sceneBlueprints = parseSceneBlueprints(
      raw?.sceneBlueprints ?? raw?.scene_blueprints
    )

    const result = await generateVoice(
      {
        script,
        userId: user.id,
        projectId: projectId ?? undefined,
        niche: typeof raw?.niche === 'string' ? raw.niche : undefined,
        tone: typeof raw?.tone === 'string' ? raw.tone : undefined,
        voiceProfileId:
          typeof raw?.voiceProfileId === 'string' ? raw.voiceProfileId : undefined,
        elevenLabsVoiceId:
          typeof raw?.elevenLabsVoiceId === 'string'
            ? raw.elevenLabsVoiceId
            : typeof raw?.voice_id === 'string'
              ? raw.voice_id
              : undefined,
        voiceName: typeof raw?.voiceName === 'string' ? raw.voiceName : undefined,
        scenes,
        sceneBlueprints,
        skipCache: true,
      },
      supabase
    )

    if (!result.audioUrl) {
      return NextResponse.json(
        {
          error: result.fallbackMessage ?? 'Voice regeneration failed',
          fallbackMessage: result.fallbackMessage,
        },
        { status: 503 }
      )
    }

    await trackUsageMetric(user.id, 'generations')
    void trackFeatureUsage(user.id, FeatureUsageFeatures.VOICE_GENERATION, projectId)

    const updatedBlueprints =
      result.voiceMetadata?.sceneDirections && sceneBlueprints.length > 0
        ? applyVoiceDirectionToBlueprints(
            sceneBlueprints,
            result.voiceMetadata.sceneDirections
          )
        : sceneBlueprints

    if (projectId && result.voiceMetadata) {
      await supabase
        .from('cinematic_projects')
        .update({
          voice: {
            voiceId: result.voiceMetadata.voiceId,
            voiceName: result.voiceMetadata.voiceName,
            style: result.voiceMetadata.profileId,
            audioUrl: result.audioUrl,
            narration: result.narration,
            metadata: result.voiceMetadata,
          },
          ...(updatedBlueprints.length > 0
            ? { scene_blueprints: updatedBlueprints }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      ok: true,
      audioUrl: result.audioUrl,
      voiceName: result.voiceMetadata?.voiceName,
      elevenLabsVoiceId: result.voiceMetadata?.voiceId,
      voiceProfileId: result.voiceMetadata?.profileId,
      provider: result.provider,
      waveform: result.waveform,
      voiceMetadata: result.voiceMetadata,
      sceneVoiceDirections: result.voiceMetadata?.sceneDirections ?? [],
      sceneBlueprints: updatedBlueprints,
      narration: result.narration,
      fallbackMessage: result.fallbackMessage ?? null,
    })
  } catch (err) {
    logError('regenerate-voice', err)
    return NextResponse.json({ error: 'Voice regeneration paused' }, { status: 500 })
  }
}
