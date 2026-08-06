import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { runV7IdeaAnalyzer } from '@/agents/v7/idea-analyzer.server'
import { runV7Research } from '@/agents/v7/research.server'
import { runV7CreativeDirector } from '@/agents/v7/creative-director.server'
import { runV7ScriptWriter } from '@/agents/v7/script-writer.server'
import { runV7CharacterDirector } from '@/agents/v7/character-director.server'
import { runV7WorldBuilder } from '@/agents/v7/world-builder.server'
import { runV7Storyboard } from '@/agents/v7/storyboard.server'
import {
  getV7Production,
  insertV7Production,
  replaceV7Scenes,
  updateV7Production,
  upsertV7Stage,
} from '@/lib/v7/db.server'
import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import { syncV7ProductionToCinematicProject } from '@/lib/v7/sync-cinematic-project.server'
import {
  runV7AnimationStage,
  runV7EditStage,
  runV7ExportStage,
  runV7ImageStage,
  runV7MusicStage,
  runV7QualityStage,
  runV7RenderStage,
  runV7SoundStage,
  runV7VoiceStage,
} from '@/lib/v7/stages/media.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ResearchBrief } from '@/agents/v7/research.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import type { V7SoundEffect } from '@/lib/v3/sound-cascade.server'
import type { V7StageId, V7AdvanceSnapshot } from '@/types/v7/production'
import {
  logV7StageError,
  V7StageExecutionError,
} from '@/lib/v7/api-errors.server'
import {
  acquireProductionLock,
  canStartStage,
  enqueueNextPipelineStage,
  findFirstFailedStage,
  findNextQueuedStage,
  findRunningStage,
  isStaleRunningStage,
  markStageBlocked,
  reconcilePipelineIntegrity,
  recoverStaleRunningStage,
  releaseProductionLock,
  toV7AdvanceSnapshot,
} from '@/lib/v7/pipeline-sync.server'

function getStageOutput<T>(stages: Array<{ stage: string; output: Record<string, unknown> | null }>, stage: V7StageId, key: string): T | null {
  const row = stages.find((s) => s.stage === stage)
  const value = row?.output?.[key]
  return value != null ? (value as T) : null
}

export async function startV7Production(params: {
  supabase: SupabaseServerClient
  userId: string
  prompt: string
  productionId?: string
}) {
  let productionId = params.productionId

  if (!productionId) {
    const production = await insertV7Production(params.supabase, {
      userId: params.userId,
      prompt: params.prompt,
    })
    productionId = production.id
  }

  await updateV7Production(params.supabase, productionId, params.userId, {
    status: 'planning',
    current_stage: 'idea',
  })

  await upsertV7Stage(params.supabase, {
    productionId,
    stage: 'idea',
    status: 'running',
    input: { prompt: params.prompt },
  })

  try {
    const { brief, durationMs } = await runV7IdeaAnalyzer({
      prompt: params.prompt,
      productionId,
    })

    await upsertV7Stage(params.supabase, {
      productionId,
      stage: 'idea',
      status: 'completed',
      input: { prompt: params.prompt },
      output: { brief, durationMs },
    })

    await updateV7Production(params.supabase, productionId, params.userId, {
      title: brief.title,
      status: 'producing',
      creative_brief: brief,
      current_stage: 'research',
    })

    await upsertV7Stage(params.supabase, {
      productionId,
      stage: 'research',
      status: 'queued',
      input: { brief },
    })
  } catch (error) {
    logV7StageError({ stage: 'idea', productionId, error })
    const message = error instanceof Error ? error.message : 'Idea analysis failed'
    await upsertV7Stage(params.supabase, {
      productionId,
      stage: 'idea',
      status: 'failed',
      error: message,
    })
    await updateV7Production(params.supabase, productionId, params.userId, {
      status: 'failed',
      current_stage: 'idea',
    })
    throw new V7StageExecutionError('idea', error, { productionId })
  }

  const snapshot = await getV7Production(params.supabase, productionId, params.userId)
  if (!snapshot) throw new Error('Production not found after idea analysis')

  try {
    return await advanceV7Production({
      supabase: params.supabase,
      productionId,
      userId: params.userId,
    })
  } catch {
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  }
}

export async function advanceV7Production(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
}): Promise<V7AdvanceSnapshot> {
  let snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) throw new Error('Production not found')

  snapshot =
    (await reconcilePipelineIntegrity({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot,
    })) ?? snapshot

  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const ideaStage = snapshot.stages.find((s) => s.stage === 'idea')
  if (ideaStage?.status !== 'completed') {
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  }

  if (snapshot.production.status === 'completed' || snapshot.production.status === 'failed') {
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  }

  if (findFirstFailedStage(snapshot.stages)) {
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  }

  let running = findRunningStage(snapshot.stages)
  if (running && isStaleRunningStage(running)) {
    await recoverStaleRunningStage({
      supabase: params.supabase,
      productionId: params.productionId,
      row: running,
    })
    await releaseProductionLock({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      token: null,
    })
    snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!snapshot) throw new Error('Production not found after stale recovery')
    running = findRunningStage(snapshot.stages)
  }

  if (running) {
    return toV7AdvanceSnapshot(snapshot, {
      blocked: true,
      reason: `${running.stage}_in_progress`,
    })
  }

  const nextRow = findNextQueuedStage(snapshot.stages)
  if (!nextRow) {
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  }

  const stage = nextRow.stage
  const startCheck = canStartStage(stage, snapshot)
  if (!startCheck.ok) {
    await markStageBlocked({
      supabase: params.supabase,
      productionId: params.productionId,
      stage,
      reason: startCheck.reason,
      input: nextRow.input,
    })
    const blockedSnapshot = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!blockedSnapshot) throw new Error('Production not found')
    return toV7AdvanceSnapshot(blockedSnapshot, {
      blocked: true,
      reason: startCheck.reason,
    })
  }

  const lock = await acquireProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    stage,
  })

  if (!lock.acquired) {
    return toV7AdvanceSnapshot(snapshot, {
      blocked: true,
      reason: 'production_locked',
    })
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    current_stage: stage,
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage,
    status: 'running',
    input: nextRow.input,
    output: null,
    error: null,
  })

  try {
    await executeV7Stage(
      params.supabase,
      params.productionId,
      params.userId,
      stage,
      brief,
      snapshot.stages
    )

    await enqueueNextPipelineStage({
      supabase: params.supabase,
      productionId: params.productionId,
      completedStage: stage,
      brief,
    })

    snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!snapshot) throw new Error('Production not found after stage')
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  } catch (error) {
    logV7StageError({ stage, productionId: params.productionId, error })
    const message = error instanceof Error ? error.message : `${stage} failed`
    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage,
      status: 'failed',
      error: message,
    })
    await updateV7Production(params.supabase, params.productionId, params.userId, {
      status: 'failed',
      current_stage: stage,
    })
    throw new V7StageExecutionError(stage, error, { productionId: params.productionId })
  } finally {
    await releaseProductionLock({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      token: lock.token,
    })
  }
}

async function executeV7Stage(
  supabase: SupabaseServerClient,
  productionId: string,
  userId: string,
  stage: V7StageId,
  brief: V7CreativeBrief,
  stages: Array<{ stage: string; output: Record<string, unknown> | null }>
) {
  if (stage === 'research') {
    const { research, durationMs } = await runV7Research({ brief, productionId })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { research, durationMs },
    })
    return
  }

  const research = getStageOutput<V7ResearchBrief>(stages, 'research', 'research')!

  if (stage === 'creative') {
    const { direction, durationMs } = await runV7CreativeDirector({
      brief,
      research,
      productionId,
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { direction, durationMs },
    })
    return
  }

  const direction = getStageOutput<V7CreativeDirection>(stages, 'creative', 'direction')!

  if (stage === 'script') {
    const { script, durationMs } = await runV7ScriptWriter({
      brief,
      research,
      direction,
      productionId,
    })
    await replaceV7Scenes(
      supabase,
      productionId,
      script.scenes.map((scene) => ({
        number: scene.number,
        script: scene as unknown as Record<string, unknown>,
        duration: scene.duration,
      }))
    )
    const syncedBrief: V7CreativeBrief = {
      ...brief,
      sceneCount: script.scenes.length,
    }
    await updateV7Production(supabase, productionId, userId, {
      creative_brief: syncedBrief,
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { script, durationMs },
    })
    return
  }

  const script = getStageOutput<V7ScriptDocument>(stages, 'script', 'script')!

  if (stage === 'character') {
    const storyboard =
      getStageOutput<V7StoryboardDocument>(stages, 'storyboard', 'storyboard') ??
      ({ scenes: [] } as V7StoryboardDocument)
    const { bible, durationMs } = await runV7CharacterDirector({
      brief,
      script,
      storyboard,
      productionId,
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { bible, durationMs },
    })
    return
  }

  if (stage === 'world') {
    const { world, durationMs } = await runV7WorldBuilder({
      brief,
      direction,
      script,
      productionId,
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { world, durationMs },
    })
    return
  }

  if (stage === 'storyboard') {
    const { storyboard, durationMs } = await runV7Storyboard({
      brief,
      direction,
      script,
      productionId,
    })

    const snapshot = await getV7Production(supabase, productionId, userId)
    for (const scene of snapshot?.scenes ?? []) {
      const board = storyboard.scenes.find((s) => s.number === scene.number)
      if (!board) continue
      const existing = (scene.storyboard as Record<string, unknown> | null) ?? {}
      const { error } = await supabase
        .from('v7_scenes')
        .update({
          storyboard: {
            ...existing,
            ...board,
          } as Record<string, unknown>,
        })
        .eq('id', scene.id)
      if (error) {
        throw new Error(`Failed to persist storyboard for scene ${scene.number}: ${error.message}`)
      }
    }

    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { storyboard, durationMs },
    })
    return
  }

  const storyboard = getStageOutput<V7StoryboardDocument>(stages, 'storyboard', 'storyboard')!
  const characterBible = getStageOutput<V7CharacterBible>(stages, 'character', 'bible')
  const worldBible = getStageOutput<V7WorldBible>(stages, 'world', 'world')
  const snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) throw new Error('Snapshot missing')

    if (stage === 'image') {
    const { images } = await runV7ImageStage({
      brief,
      direction,
      script,
      storyboard,
      scenes: snapshot.scenes.map((s) => ({ id: s.id, number: s.number })),
      productionId,
      characterBible,
      worldBible,
    })

    const successful = images.filter((img) => img.row.image_url?.trim())
    if (successful.length === 0) {
      throw new Error('Image generation failed for all scenes')
    }
    if (successful.length < snapshot.scenes.length) {
      throw new Error(
        `Image generation incomplete: ${successful.length}/${snapshot.scenes.length} scenes`
      )
    }

    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { images: images.map((i) => i.row.image_url) },
    })
    return
  }

  if (stage === 'animation') {
    const { sceneMotion, sceneUpdates, provider, durationMs } = await runV7AnimationStage({
      brief,
      direction,
      script,
      storyboard,
      scenes: snapshot.scenes.map((s) => ({
        id: s.id,
        number: s.number,
        storyboard: s.storyboard as Record<string, unknown>,
      })),
      productionId,
    })

    for (const update of sceneUpdates) {
      const scene = snapshot.scenes.find((s) => s.id === update.sceneId)
      if (!scene) continue
      await supabase
        .from('v7_scenes')
        .update({
          storyboard: {
            ...(scene.storyboard as Record<string, unknown>),
            motionPresetId: update.motionPresetId,
            animationProvider: provider,
          },
        })
        .eq('id', scene.id)
    }

    const existingTimeline =
      (snapshot.production.timeline_json as Record<string, unknown> | null) ?? {}
    await updateV7Production(supabase, productionId, userId, {
      timeline_json: {
        ...existingTimeline,
        sceneMotion,
        animationProvider: provider,
      },
    })

    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { provider, sceneCount: sceneUpdates.length, durationMs },
    })
    return
  }

  if (stage === 'voice') {
    const { voiceUrl, provider, durationMs, fallbackMessage, narrationSegments } =
      await runV7VoiceStage({
        brief,
        script,
        storyboard,
        userId,
        productionId,
        snapshot,
        characterBible,
        worldBible,
      })
    if (voiceUrl) {
      await updateV7Production(supabase, productionId, userId, { voice_url: voiceUrl })
    }
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: {
        voiceUrl,
        provider,
        durationMs,
        fallbackMessage: fallbackMessage ?? null,
        narrationSegments,
      },
    })
    return
  }

  if (stage === 'music') {
    const { musicUrl, provider, durationMs } = await runV7MusicStage({ brief })
    await updateV7Production(supabase, productionId, userId, { music_url: musicUrl })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { musicUrl, provider, durationMs },
    })
    return
  }

  if (stage === 'sound') {
    const { sfx, provider, durationMs } = await runV7SoundStage({ script, storyboard, snapshot })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { sfx, provider, durationMs },
    })
    return
  }

  if (stage === 'edit') {
    const freshSnapshot = await getV7Production(supabase, productionId, userId)
    if (!freshSnapshot) throw new Error('Snapshot missing before edit')
    const soundStage = freshSnapshot.stages.find((row) => row.stage === 'sound')
    const sfx = (soundStage?.output as { sfx?: unknown[] } | null)?.sfx
    const { timeline, durationMs } = await runV7EditStage({
      script,
      brief,
      productionId,
      snapshot: freshSnapshot,
      sfx: sfx as V7SoundEffect[] | undefined,
    })
    const existingTimeline =
      (freshSnapshot.production.timeline_json as Record<string, unknown> | null) ?? {}
    await updateV7Production(supabase, productionId, userId, {
      timeline_json: {
        ...existingTimeline,
        ...(timeline as unknown as Record<string, unknown>),
      },
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { timeline, durationMs },
    })
    return
  }

  if (stage === 'quality') {
    const freshSnapshot = await getV7Production(supabase, productionId, userId)
    if (!freshSnapshot) throw new Error('Snapshot missing before quality check')
    const { passed, issues, durationMs } = await runV7QualityStage({ snapshot: freshSnapshot })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { passed, issues, durationMs },
    })
    return
  }

  if (stage === 'render') {
    const freshSnapshot = await getV7Production(supabase, productionId, userId)
    if (!freshSnapshot) throw new Error('Snapshot missing before render')

    const { reelUrl, thumbnailUrl, durationMs, mock } = await runV7RenderStage({
      supabase,
      productionId,
      userId,
      snapshot: freshSnapshot,
    })
    await updateV7Production(supabase, productionId, userId, {
      reel_url: reelUrl,
      thumbnail_url: thumbnailUrl ?? freshSnapshot.production.thumbnail_url,
      export_status: 'completed',
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { reelUrl, thumbnailUrl, durationMs, mock },
    })
    return
  }

  if (stage === 'export') {
    const freshSnapshot = await getV7Production(supabase, productionId, userId)
    if (!freshSnapshot?.production.reel_url) {
      throw new Error('MP4 missing — cannot export deliverables')
    }

    const renderStage = freshSnapshot.stages.find((s) => s.stage === 'render')
    const renderThumb =
      (renderStage?.output?.thumbnailUrl as string | null | undefined) ??
      freshSnapshot.production.thumbnail_url

    const { movUrl, creatorPackUrl, thumbnailUrl, durationMs } = await runV7ExportStage({
      snapshot: freshSnapshot,
      reelUrl: freshSnapshot.production.reel_url,
      renderThumbnailUrl: renderThumb,
    })

    await updateV7Production(supabase, productionId, userId, {
      mov_url: movUrl,
      creator_pack_url: creatorPackUrl,
      thumbnail_url: thumbnailUrl ?? freshSnapshot.production.thumbnail_url,
      status: 'completed',
      current_stage: 'export',
      export_status: 'completed',
    })
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { movUrl, creatorPackUrl, thumbnailUrl, durationMs },
    })

    const completedSnapshot = await getV7Production(supabase, productionId, userId)
    if (completedSnapshot) {
      await syncV7ProductionToCinematicProject({
        supabase,
        snapshot: completedSnapshot,
      }).catch(() => undefined)
    }
  }
}
