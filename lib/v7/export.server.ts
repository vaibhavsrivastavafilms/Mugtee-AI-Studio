import 'server-only'

import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import type { V7SoundEffect } from '@/lib/v3/sound-cascade.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { assignSceneMotion, parseSceneMotionMap, type SceneMotionMap } from '@/lib/motion/motion-presets'
import { generateVoice } from '@/lib/voice/generateVoice'
import { synthesizeWithCascade } from '@/lib/voice/tts-cascade'
import { updateV7Production } from '@/lib/v7/db.server'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import type { FacelessRenderInput } from '@/lib/video/types'
import type { V7ProductionSnapshot } from '@/types/v7/production'
import {
  buildGroundedV7SceneFields,
  groundedFieldsToGeneratedScene,
  validateV7ProductionGrounding,
  type V7SceneStoryboardRecord,
  type V7ScriptScene,
  type V7StoryboardShot,
} from '@/lib/v7/scene-grounding.server'
import {
  buildV7ScenePackages,
  buildV7TimelineFromPackages,
  loadV7StageBibles,
  mergeV7VoiceNarration,
  packagesToSubtitleSegments,
  type V7ProductionTimeline,
  type V7ScenePackage,
} from '@/lib/v7/scene-package.server'
import {
  assertProductionRenderAllowed,
  assertRealVoiceRequired,
  allowSilentVoiceFallback,
} from '@/lib/v7/production-integrity.server'
import { showOnScreenText } from '@/lib/remotion/show-on-screen-text.server'
import { validateSceneVideoSourcesForRender } from '@/lib/v7/render-media-validation.server'
import {
  assertV9StoryExecutionReady,
  logV92Report,
  runV9StoryExecutionAudit,
  validateV92RenderedMovie,
} from '@/lib/v7/story-execution-audit.server'

export function buildV7ScenePackagesFromSnapshot(snapshot: V7ProductionSnapshot): V7ScenePackage[] {
  return buildV7ScenePackages(snapshot)
}

export function readV7ProductionTimeline(snapshot: V7ProductionSnapshot): V7ProductionTimeline | null {
  const raw = snapshot.production.timeline_json as V7ProductionTimeline | null
  if (!raw?.scenes?.length) return null
  return raw
}

function readTimelineSoundTracks(snapshot: V7ProductionSnapshot): V7SoundEffect[] {
  const timeline = readV7ProductionTimeline(snapshot)
  if (!timeline?.soundTracks?.length) {
    const soundStage = snapshot.stages.find((row) => row.stage === 'sound')
    return (soundStage?.output as { sfx?: V7SoundEffect[] } | null)?.sfx ?? []
  }
  return timeline.soundTracks.map((track) => ({
    name: track.name,
    url: track.url,
    startSec: track.startSec,
  }))
}

export function buildV7GeneratedScenes(snapshot: V7ProductionSnapshot): GeneratedScene[] {
  const brief = snapshot.production.creative_brief
  const bibles = loadV7StageBibles(snapshot)
  const packages = buildV7ScenePackages(snapshot)

  return packages.map((pkg) => {
    const scene = snapshot.scenes.find((row) => row.id === pkg.sceneId)
    const script = scene?.script as V7ScriptScene | undefined
    const board = (scene?.storyboard ?? {}) as V7SceneStoryboardRecord
    const shot = board.shots?.[0] as V7StoryboardShot | undefined

    const fields = buildGroundedV7SceneFields({
      sceneNumber: pkg.sceneNumber,
      sceneId: pkg.sceneId,
      scriptScene: script,
      shot,
      board,
      brief: brief ?? undefined,
      direction: bibles.direction ?? undefined,
      characterBible: bibles.characterBible,
      worldBible: bibles.worldBible,
      fallbackDuration: pkg.durationSec,
    })

    const generated = groundedFieldsToGeneratedScene(pkg.sceneId, fields, {
      allowImageAsVideoFallback: false,
    })

    const narration = pkg.narration.trim() || pkg.dialogue.trim()
    const shotNarration = pkg.shots
      .map((entry) => entry.dialogue.trim() || entry.narration.trim())
      .filter(Boolean)
      .join(' ')

    return {
      ...generated,
      description: [narration, shotNarration].filter(Boolean).join(' ') || generated.description,
      title: script?.title?.trim() || generated.title,
    }
  })
}

export function resolveV7SceneMotion(snapshot: V7ProductionSnapshot): SceneMotionMap {
  const timeline = snapshot.production.timeline_json as { sceneMotion?: unknown } | null
  const fromTimeline = parseSceneMotionMap(timeline?.sceneMotion)
  if (Object.keys(fromTimeline).length > 0) return fromTimeline

  const scenes = buildV7GeneratedScenes(snapshot)
  return assignSceneMotion(scenes, null, null)
}

async function resolveV7VoiceUrl(
  snapshot: V7ProductionSnapshot,
  params: { supabase: SupabaseServerClient; userId: string }
): Promise<string | null> {
  const existing = snapshot.production.voice_url?.trim()
  if (existing) {
    console.info(
      '[V7_VOICE_RESOLVE]',
      JSON.stringify({
        VOICE_PROVIDER: 'existing',
        VOICEOVER_AVAILABLE: true,
        VOICEOVER_URL_PRESENT: true,
      })
    )
    return existing
  }

  const narration = mergeV7VoiceNarration(snapshot)
  const voice = await generateVoice(
    {
      script: narration.trim() || ' ',
      userId: params.userId,
      projectId: snapshot.production.id,
      tone: snapshot.production.creative_brief?.voiceDirection,
      preferElevenLabs: false,
    },
    params.supabase
  )

  if (voice.audioUrl?.trim()) {
    const voiceUrl = voice.audioUrl.trim()
    const persisted = !voiceUrl.startsWith('data:')
    if (persisted) {
      await updateV7Production(params.supabase, snapshot.production.id, params.userId, {
        voice_url: voiceUrl,
      })
    }
    console.info(
      '[V7_VOICE_RESOLVE]',
      JSON.stringify({
        VOICE_PROVIDER: voice.provider,
        VOICEOVER_AVAILABLE: true,
        VOICEOVER_URL_PRESENT: true,
        VOICEOVER_PERSISTED: persisted,
        bufferBytes: voice.buffer?.length ?? null,
      })
    )
    return voiceUrl
  }

  const cascade = await synthesizeWithCascade(narration.trim() || ' ', {
    allowSilentStub: allowSilentVoiceFallback(),
  })
  if (cascade.buffer && cascade.provider !== 'silent') {
    console.info(
      '[V7_VOICE_RESOLVE]',
      JSON.stringify({
        VOICE_PROVIDER: cascade.provider,
        VOICEOVER_AVAILABLE: true,
        VOICEOVER_URL_PRESENT: true,
        VOICEOVER_PERSISTED: false,
        bufferBytes: cascade.buffer.length,
      })
    )
    return `data:audio/mpeg;base64,${cascade.buffer.toString('base64')}`
  }

  console.warn(
    '[V7_VOICE_RESOLVE]',
    JSON.stringify({
      VOICE_PROVIDER: cascade.provider,
      VOICEOVER_AVAILABLE: false,
      VOICEOVER_URL_PRESENT: false,
      bufferBytes: cascade.buffer?.length ?? 0,
    })
  )

  assertRealVoiceRequired({
    voiceUrl: null,
    provider: cascade.provider,
    narrationLength: narration.trim().length,
  })

  return null
}

function buildV7RenderInput(snapshot: V7ProductionSnapshot, voiceUrl: string | null): FacelessRenderInput {
  const packages = buildV7ScenePackages(snapshot)
  const scenes = buildV7GeneratedScenes(snapshot)
  const subtitles = showOnScreenText() ? packagesToSubtitleSegments(packages) : []

  const scriptText = packages
    .map((pkg) => {
      const shotText = pkg.shots.map((s) => s.dialogue || s.narration).filter(Boolean).join(' ')
      return pkg.narration.trim() || shotText || pkg.dialogue.trim() || pkg.sceneDescription.trim()
    })
    .filter(Boolean)
    .join('\n\n')

  return {
    idea: snapshot.production.prompt,
    title: snapshot.production.title,
    script: scriptText,
    scenes,
    voiceAudioPath: null,
    voiceUrl,
    subtitles,
    userId: snapshot.production.user_id,
    projectId: snapshot.production.id,
    aspectRatio: snapshot.production.creative_brief?.aspectRatio ?? '9:16',
  }
}

export function buildV7ExportTimeline(snapshot: V7ProductionSnapshot) {
  return readV7ProductionTimeline(snapshot) ?? buildV7TimelineFromPackages(buildV7ScenePackages(snapshot))
}

export async function executeV7Render(params: {
  supabase: SupabaseServerClient
  snapshot: V7ProductionSnapshot
  userId: string
  /** Replace an existing reel (e.g. text-free re-render) without regenerating source media. */
  forceRerender?: boolean
}): Promise<{ reelUrl: string; thumbnailUrl: string | null; durationMs: number; mock: boolean }> {
  const started = Date.now()
  const { production } = params.snapshot

  if (production.reel_url && !params.forceRerender) {
    return {
      reelUrl: production.reel_url,
      thumbnailUrl: production.thumbnail_url,
      durationMs: Date.now() - started,
      mock: false,
    }
  }

  const renderBlocked = await guardUsageLimit(params.userId, 'renders')
  if (renderBlocked) {
    const body = (await renderBlocked.json()) as { error?: string }
    throw new Error(body.error ?? 'Render limit reached')
  }

  const groundingIssues = validateV7ProductionGrounding(params.snapshot)
  if (groundingIssues.length > 0) {
    const preAudit = runV9StoryExecutionAudit({
      snapshot: params.snapshot,
      voiceUrl: params.snapshot.production.voice_url,
    })
    logV92Report({ ...preAudit, passed: false, blockers: groundingIssues })
    throw new Error(`Render blocked — storyboard grounding incomplete: ${groundingIssues.join('; ')}`)
  }

  assertProductionRenderAllowed()

  const voiceUrl = await resolveV7VoiceUrl(params.snapshot, {
    supabase: params.supabase,
    userId: params.userId,
  })
  const sceneMotion = resolveV7SceneMotion(params.snapshot)
  const renderInput = buildV7RenderInput(params.snapshot, voiceUrl)
  await validateSceneVideoSourcesForRender(renderInput.scenes)
  const packages = buildV7ScenePackages(params.snapshot)
  const expectedDurationSec = packages.reduce((sum, pkg) => sum + Math.max(2, pkg.durationSec), 0)

  const audit = runV9StoryExecutionAudit({
    snapshot: params.snapshot,
    renderInput,
    voiceUrl,
  })
  logV92Report(audit)
  assertV9StoryExecutionReady(audit)

  const musicUrl = production.music_url ?? resolveMvpRoyaltyFreeMusicUrl()
  const sfxTracks = readTimelineSoundTracks(params.snapshot)

  if (process.env.VIDEO_RENDER_MOCK === 'true') {
    throw new Error(
      'Mock render path reached despite production integrity guard — check V7_ALLOW_MOCK_RENDER'
    )
  }

  const result = await orchestrateRemotionReel(renderInput, {
    jobId: `v7-render-${production.id}`,
    musicUrl,
    sfxTracks,
    sceneMotion,
  })

  if (!result.videoUrl) throw new Error('Render did not produce an MP4')
  if (result.mock) {
    throw new Error('Mock MP4 render is not permitted — configure real Remotion/FFmpeg export')
  }

  const postRenderIssues = validateV92RenderedMovie({
    audit,
    renderResult: result,
    expectedDurationSec,
  })
  if (postRenderIssues.length > 0) {
    console.warn('[V9.2_REPORT]', JSON.stringify({ postRenderIssues, productionId: production.id }))
    throw new Error(`Final movie validation failed: ${postRenderIssues.join('; ')}`)
  }

  await trackUsageMetric(params.userId, 'renders')

  return {
    reelUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl ?? null,
    durationMs: Date.now() - started,
    mock: Boolean(result.mock),
  }
}
