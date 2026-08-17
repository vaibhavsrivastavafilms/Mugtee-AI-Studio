import 'server-only'

import { resolveV7MusicUrl } from '@/lib/v3/music-cascade.server'
import { generateV7SoundEffects } from '@/lib/v3/sound-cascade.server'
import { generateVoice } from '@/lib/voice/generateVoice'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import { runV7ImageOrchestrator } from '@/lib/v7/image-scene.server'
import { reconcileV7SceneVideoCheckpoints, runV7VideoOrchestrator } from '@/lib/v7/video-scene.server'
import { assignSceneMotion, sceneMotionToGeneratedFields } from '@/lib/motion/motion-presets'
import { executeV7Render } from '@/lib/v7/export.server'
import { executeV7ExportDeliverables } from '@/lib/v7/export-deliverables.server'
import { synthesizeWithCascade } from '@/lib/voice/tts-cascade'
import {
  buildGroundedV7SceneFields,
  buildScreenplayNarration,
  groundedFieldsToGeneratedScene,
  type V7SceneStoryboardRecord,
} from '@/lib/v7/scene-grounding.server'
import {
  buildV7TimelineFromScript,
  buildV7ProductionTimeline,
  buildV7VoiceNarrationSegments,
  mergeV7VoiceNarration,
} from '@/lib/v7/scene-package.server'
import {
  assertV9StoryExecutionReady,
  logV92Report,
  runV9StoryExecutionAudit,
} from '@/lib/v7/story-execution-audit.server'
import { v7VoiceLanguageCode } from '@/lib/v7/language-routing.core'
import { allowSilentVoiceFallback } from '@/lib/v7/production-integrity.server'
import { validateV7ProductionMediaAssets } from '@/lib/v7/media-probe.server'
import type { V7SoundEffect } from '@/lib/v3/sound-cascade.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import type { V7ProductionSnapshot } from '@/types/v7/production'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'

export async function runV7ImageStage(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number }>
  productionId: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
  supabase?: SupabaseServerClient
}) {
  return runV7ImageOrchestrator(params)
}

export async function runV7AnimationStage(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number; storyboard?: Record<string, unknown> }>
  productionId: string
  supabase?: SupabaseServerClient
}) {
  const { sceneUpdates, provider, durationMs } = await runV7VideoOrchestrator(params)

  const generatedScenes = params.scenes.map((scene) => {
    const update = sceneUpdates.find((entry) => entry.sceneId === scene.id)
    const boardData = (scene.storyboard ?? {}) as V7SceneStoryboardRecord
    const fields = buildGroundedV7SceneFields({
      sceneNumber: scene.number,
      sceneId: scene.id,
      scriptScene: params.script.scenes.find((s) => s.number === scene.number),
      shot: params.storyboard.scenes.find((s) => s.number === scene.number)?.shots[0],
      board: {
        ...boardData,
        videoUrl: update?.videoUrl ?? boardData.videoUrl,
      },
      brief: params.brief,
      direction: params.direction,
      fallbackDuration: update?.durationSec ?? params.brief.duration / Math.max(params.scenes.length, 1),
    })
    return { scene, fields, generated: groundedFieldsToGeneratedScene(scene.id, fields, { allowImageAsVideoFallback: false }) }
  })

  const missingVideos = generatedScenes.filter(({ fields }) => !fields.videoUrl?.trim())
  if (missingVideos.length > 0) {
    throw new Error(`Scene video generation incomplete (${missingVideos.length} missing)`)
  }

  const sceneMotion = assignSceneMotion(
    generatedScenes.map((entry) => entry.generated),
    null,
    null
  )

  return {
    sceneMotion,
    sceneUpdates: sceneUpdates.map((update) => ({
      sceneId: update.sceneId,
      motionPresetId: sceneMotionToGeneratedFields(update.sceneId, sceneMotion).motionPresetId ?? null,
    })),
    provider,
    durationMs,
  }
}

export async function runV7VoiceStage(params: {
  brief: V7CreativeBrief
  script: V7ScriptDocument
  storyboard?: V7StoryboardDocument
  userId: string
  productionId: string
  snapshot?: V7ProductionSnapshot
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
  supabase?: SupabaseServerClient
}) {
  const started = Date.now()
  const narrationSegments = params.snapshot
    ? buildV7VoiceNarrationSegments(params.snapshot)
    : params.script.scenes.map((scene) => ({
        sceneNumber: scene.number,
        sceneId: `script-${scene.number}`,
        text: [scene.narration, scene.dialogue].filter(Boolean).join(' ').trim(),
        durationSec: scene.duration ?? params.brief.duration / Math.max(params.brief.sceneCount, 1),
        emotion: scene.emotion ?? params.brief.emotion,
      }))

  const narration = params.snapshot
    ? mergeV7VoiceNarration(params.snapshot)
    : buildScreenplayNarration(params.script, params.storyboard)

  const supabase = params.supabase ?? (await createSupabaseServerClient())

  const voice = await generateVoice(
    {
      script: narration || ' ',
      userId: params.userId,
      projectId: params.productionId,
      tone: params.brief.voiceDirection,
      contentLanguage: v7VoiceLanguageCode(params.brief),
    },
    supabase
  )

  const audioDurationSec = voice.voiceMetadata?.durationSec ?? null

  if (voice.audioUrl?.trim()) {
    return {
      voiceUrl: voice.audioUrl,
      provider: voice.provider,
      durationMs: Date.now() - started,
      fallbackMessage: voice.fallbackMessage ?? null,
      narrationSegments,
      audioDurationSec,
    }
  }

  const cascade = await synthesizeWithCascade(narration || ' ', {
    allowSilentStub: allowSilentVoiceFallback(),
    languageCode: v7VoiceLanguageCode(params.brief),
  })
  if (cascade.buffer && cascade.provider !== 'silent') {
    const dataUrl = `data:audio/mpeg;base64,${cascade.buffer.toString('base64')}`
    return {
      voiceUrl: dataUrl,
      provider: cascade.provider,
      durationMs: Date.now() - started,
      fallbackMessage: cascade.fallbackMessage ?? 'Voice unavailable — render will synthesize silence if needed.',
      narrationSegments,
      audioDurationSec,
    }
  }

  console.warn(
    '[V9_WARNING]',
    JSON.stringify({
      event: 'voice_generation_failed',
      productionId: params.productionId,
      segmentCount: narrationSegments.length,
      message: 'Voice unavailable — configure TTS or set V7_ALLOW_SILENT_VOICE=true for dev only.',
    })
  )

  return {
    voiceUrl: null,
    provider: 'none' as const,
    durationMs: Date.now() - started,
    fallbackMessage: 'Voice unavailable — render will use silent fallback.',
    narrationSegments,
    audioDurationSec: null,
  }
}

export async function runV7MusicStage(params?: { brief?: V7CreativeBrief }) {
  const result = await resolveV7MusicUrl({
    emotion: params?.brief?.emotion,
    durationSec: params?.brief?.duration,
    pacing: params?.brief?.style,
  })
  return { musicUrl: result.musicUrl, provider: result.provider, durationMs: 0 }
}

export async function runV7SoundStage(params?: {
  script?: V7ScriptDocument
  storyboard?: V7StoryboardDocument
  snapshot?: V7ProductionSnapshot
}) {
  const scenes =
    params?.snapshot?.scenes.map((scene) => {
      const script = scene.script as { location?: string; action?: string }
      const board = (scene.storyboard ?? {}) as { shots?: Array<{ dialogue?: string }> }
      const shotDialogue = board.shots?.map((shot) => shot.dialogue).filter(Boolean).join(' ')
      return {
        location: script.location,
        action: [script.action, shotDialogue].filter(Boolean).join(' '),
        sceneNumber: scene.number,
      }
    }) ??
    params?.script?.scenes.map((scene, index) => ({
      location: scene.location,
      action: scene.action,
      sceneNumber: scene.number ?? index + 1,
    }))

  const result = await generateV7SoundEffects({ scenes })
  return { sfx: result.sfx, provider: result.provider, durationMs: 0 }
}

export async function runV7EditStage(params: {
  script: V7ScriptDocument
  brief: V7CreativeBrief
  productionId?: string
  snapshot?: V7ProductionSnapshot
  sfx?: V7SoundEffect[]
}) {
  const timeline =
    params.snapshot != null
      ? buildV7ProductionTimeline({ snapshot: params.snapshot, sfx: params.sfx })
      : buildV7TimelineFromScript({
          script: params.script,
          brief: params.brief,
          productionId: params.productionId,
        })

  return {
    timeline,
    durationMs: 0,
  }
}

export async function runV7QualityStage(params: {
  snapshot: V7ProductionSnapshot
  supabase?: SupabaseServerClient
}) {
  let snapshot = params.snapshot

  if (params.supabase) {
    await reconcileV7SceneVideoCheckpoints({
      supabase: params.supabase,
      productionId: snapshot.production.id,
      userId: snapshot.production.user_id,
      scenes: snapshot.scenes.map((scene) => ({
        id: scene.id,
        number: scene.number,
        storyboard: scene.storyboard as Record<string, unknown> | null,
      })),
    })
    const refreshed = await getV7Production(
      params.supabase,
      snapshot.production.id,
      snapshot.production.user_id
    )
    if (refreshed) snapshot = refreshed
  }

  const mediaIssues = await validateV7ProductionMediaAssets(snapshot)
  if (mediaIssues.length > 0) {
    throw new Error(`Media probe failed: ${mediaIssues.join('; ')}`)
  }

  const audit = runV9StoryExecutionAudit({
    snapshot,
    voiceUrl: snapshot.production.voice_url,
  })
  logV92Report(audit)
  assertV9StoryExecutionReady(audit)
  return { passed: true, issues: [] as string[], durationMs: 0 }
}

export async function runV7RenderStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}) {
  const result = await executeV7Render({
    supabase: params.supabase,
    snapshot: params.snapshot,
    userId: params.userId,
  })
  return result
}

export async function runV7ExportStage(params: {
  snapshot: V7ProductionSnapshot
  reelUrl: string
  renderThumbnailUrl?: string | null
}) {
  const deliverables = await executeV7ExportDeliverables({
    snapshot: params.snapshot,
    reelUrl: params.reelUrl,
    renderThumbnailUrl: params.renderThumbnailUrl ?? null,
  })
  return {
    movUrl: deliverables.movUrl,
    creatorPackUrl: deliverables.creatorPackUrl,
    thumbnailUrl: deliverables.thumbnailUrl,
    durationMs: deliverables.durationMs,
  }
}
