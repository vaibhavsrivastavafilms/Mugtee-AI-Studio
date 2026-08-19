import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { runV7IdeaAnalyzer } from '@/agents/v7/idea-analyzer.server'
import { runV7ConceptGenerator } from '@/agents/v7/concept-generator.server'
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
  persistV7AudioUrl,
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
  V7AllProvidersFailedError,
  V7ProviderRequestError,
  isV7RetryableError,
} from '@/lib/v7/providers/text-errors.server'
import { TextProviderError } from '@/lib/ai/errors'
import {
  V7AllVideoProvidersFailedError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import { formatV7AnimationStageError } from '@/lib/v7/providers/video-chain-result.server'
import { ProviderManager } from '@/lib/v7/providers/provider-manager.server'
import {
  assertV7MusicProviderConfigured,
  assertV7SoundProviderConfigured,
  V7ProviderNotAvailableError,
} from '@/lib/v7/provider-availability.server'
import {
  getNextRunnableStageId,
  resolveProductionFieldsAfterStageSuccess,
  shouldPreserveCompletedStageFailure,
} from '@/lib/v7/pipeline-state.core'
import {
  isAwaitingConceptSelection,
  persistConceptSelectionAwaiting,
} from '@/lib/v7/concept-selection.server'
import {
  applySelectedConceptToBrief,
  mergeConceptSelectionTimeline,
  readConceptSelectionState,
  validateConceptIndex,
} from '@/lib/v7/concept-selection.core'
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

function isRetryableIdeaProviderError(error: unknown): boolean {
  if (error instanceof TextProviderError) {
    return ![
      'OPENROUTER_AUTH_FAILED',
      'TEXT_PROVIDER_NOT_CONFIGURED',
      'TEXT_PROVIDER_NOT_READY',
    ].includes(error.code)
  }
  if (error instanceof V7ProviderRequestError) return isV7RetryableError(error)
  return false
}

function ideaProviderErrorMessage(error: unknown): string {
  if (error instanceof TextProviderError) return `${error.code}: ${error.message}`
  if (error instanceof V7ProviderRequestError) return `${error.code}: ${error.message}`
  return error instanceof Error ? error.message : 'Idea analysis failed'
}

async function handleV7IdeaStageFailure(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  prompt: string
  error: unknown
}): Promise<'retry' | 'failed'> {
  logV7StageError({ stage: 'idea', productionId: params.productionId, error: params.error })
  const message = ideaProviderErrorMessage(params.error)

  if (isRetryableIdeaProviderError(params.error)) {
    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage: 'idea',
      status: 'queued',
      input: { prompt: params.prompt },
      error: message,
      output: null,
    })
    await updateV7Production(params.supabase, params.productionId, params.userId, {
      status: 'planning',
      current_stage: 'idea',
    })
    return 'retry'
  }

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'idea',
    status: 'failed',
    error: message,
  })
  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'failed',
    current_stage: 'idea',
  })
  return 'failed'
}

async function executeV7IdeaStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  prompt: string
}) {
  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'planning',
    current_stage: 'idea',
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'idea',
    status: 'running',
    input: { prompt: params.prompt },
    output: null,
    error: null,
  })

  await ProviderManager.assertTextReady({ userId: params.userId, productionId: params.productionId })
  const { brief, durationMs } = await runV7IdeaAnalyzer({
    prompt: params.prompt,
    productionId: params.productionId,
  })

  const { concepts, durationMs: conceptsDurationMs } = await runV7ConceptGenerator({
    prompt: params.prompt,
    brief,
    productionId: params.productionId,
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'idea',
    status: 'completed',
    input: { prompt: params.prompt },
    output: { brief, durationMs, concepts, conceptsDurationMs },
  })

  await persistConceptSelectionAwaiting({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    concepts,
    brief,
  })
}

export async function bootstrapV7Production(params: {
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
    status: 'queued',
    input: { prompt: params.prompt },
    output: null,
    error: null,
  })

  const snapshot = await getV7Production(params.supabase, productionId, params.userId)
  if (!snapshot) throw new Error('Production not found after bootstrap')
  return snapshot
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
    await executeV7IdeaStage({
      supabase: params.supabase,
      productionId,
      userId: params.userId,
      prompt: params.prompt,
    })
  } catch (error) {
    const outcome = await handleV7IdeaStageFailure({
      supabase: params.supabase,
      productionId,
      userId: params.userId,
      prompt: params.prompt,
      error,
    })
    if (outcome === 'retry') {
      const snapshot = await getV7Production(params.supabase, productionId, params.userId)
      if (!snapshot) throw new Error('Production not found after idea retry queue')
      return toV7AdvanceSnapshot(snapshot, { blocked: true, reason: 'idea_provider_retry' })
    }
    throw new V7StageExecutionError('idea', error, { productionId })
  }

  const snapshot = await getV7Production(params.supabase, productionId, params.userId)
  if (!snapshot) throw new Error('Production not found after idea analysis')

  if (isAwaitingConceptSelection(snapshot.production.timeline_json)) {
    return toV7AdvanceSnapshot(snapshot, {
      blocked: true,
      reason: 'awaiting_concept_selection',
    })
  }

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

  const ideaStage = snapshot.stages.find((s) => s.stage === 'idea')
  if (ideaStage?.status !== 'completed') {
    if (ideaStage?.status === 'running') {
      return toV7AdvanceSnapshot(snapshot, {
        blocked: true,
        reason: 'idea_in_progress',
      })
    }

    if (ideaStage?.status === 'queued' || ideaStage?.status === 'failed') {
      const prompt =
        (ideaStage.input as { prompt?: string } | null)?.prompt?.trim() ||
        snapshot.production.prompt?.trim()
      if (!prompt) {
        return toV7AdvanceSnapshot(snapshot, {
          blocked: true,
          reason: 'idea_prompt_missing',
        })
      }

      try {
        await executeV7IdeaStage({
          supabase: params.supabase,
          productionId: params.productionId,
          userId: params.userId,
          prompt,
        })
      } catch (error) {
        const outcome = await handleV7IdeaStageFailure({
          supabase: params.supabase,
          productionId: params.productionId,
          userId: params.userId,
          prompt,
          error,
        })
        if (outcome === 'retry') {
          snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
          if (!snapshot) throw new Error('Production not found after idea retry queue')
          return toV7AdvanceSnapshot(snapshot, { blocked: true, reason: 'idea_provider_retry' })
        }
        throw new V7StageExecutionError('idea', error, { productionId: params.productionId })
      }

      snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
      if (!snapshot) throw new Error('Production not found after idea analysis')
    } else {
      return toV7AdvanceSnapshot(snapshot, { blocked: false })
    }
  }

  if (isAwaitingConceptSelection(snapshot.production.timeline_json)) {
    return toV7AdvanceSnapshot(snapshot, {
      blocked: true,
      reason: 'awaiting_concept_selection',
    })
  }

  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

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

    const statusPatch = resolveProductionFieldsAfterStageSuccess({
      completedStage: stage,
      stages: snapshot.stages,
      production: snapshot.production,
    })
    await updateV7Production(params.supabase, params.productionId, params.userId, statusPatch)

    snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!snapshot) throw new Error('Production not found after stage reconciliation')
    return toV7AdvanceSnapshot(snapshot, { blocked: false })
  } catch (error) {
    const failureProvider =
      error instanceof V7ProviderRequestError
        ? error.provider
        : error instanceof V7VideoProviderRequestError
          ? error.provider
          : error instanceof V7AllProvidersFailedError ||
              error instanceof V7AllVideoProvidersFailedError
            ? error.failures[error.failures.length - 1]?.provider
            : error instanceof V7ProviderNotAvailableError
              ? error.provider
              : undefined

    logV7StageError({
      stage,
      productionId: params.productionId,
      provider: failureProvider,
      error,
    })
    const message =
      stage === 'animation'
        ? formatV7AnimationStageError(error)
        : error instanceof Error
          ? error.message
          : `${stage} failed`

    const latestSnapshot = await getV7Production(
      params.supabase,
      params.productionId,
      params.userId
    )
    const stageRow = latestSnapshot?.stages.find((row) => row.stage === stage)
    const preserveCompletedStage = shouldPreserveCompletedStageFailure(stageRow)

    if (!preserveCompletedStage) {
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
    }
    throw new V7StageExecutionError(stage, error, {
      productionId: params.productionId,
      provider: failureProvider,
    })
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

  if (stage === 'voice') {
    const voiceSnapshot = await getV7Production(supabase, productionId, userId)
    if (!voiceSnapshot) throw new Error('Snapshot missing')

    const { voiceUrl, provider, durationMs, fallbackMessage, narrationSegments, audioDurationSec } =
      await runV7VoiceStage({
        brief,
        script,
        userId,
        productionId,
        snapshot: voiceSnapshot,
        supabase,
      })

    if (narrationSegments.length > 0 && audioDurationSec != null) {
      console.info(
        '[V7_VOICE_TIMING]',
        JSON.stringify({
          productionId,
          sceneCount: narrationSegments.length,
          audioDurationSec,
          briefDurationSec: brief.duration,
          note: 'Scene durations remain screenplay-driven; voice does not mutate scene timing.',
        })
      )
    }

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
        audioDurationSec: audioDurationSec ?? null,
      },
    })
    return
  }

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
    ProviderManager.refreshPollinationsState(userId)
    await ProviderManager.assertImageReady({ userId, productionId, forceRefresh: true })
    const { images } = await runV7ImageStage({
      brief,
      direction,
      script,
      storyboard,
      scenes: snapshot.scenes.map((s) => ({ id: s.id, number: s.number })),
      productionId,
      characterBible,
      worldBible,
      supabase,
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
    await ProviderManager.assertVideoReady({ userId, productionId, forceRefresh: true })
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
      supabase,
    })

    for (const update of sceneUpdates) {
      const { data: current } = await supabase
        .from('v7_scenes')
        .select('storyboard')
        .eq('id', update.sceneId)
        .maybeSingle()

      const storyboard = (current?.storyboard as Record<string, unknown> | null) ?? {}

      await supabase
        .from('v7_scenes')
        .update({
          storyboard: {
            ...storyboard,
            motionPresetId: update.motionPresetId,
            animationProvider: provider,
          },
        })
        .eq('id', update.sceneId)
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

  if (stage === 'music') {
    assertV7MusicProviderConfigured()
    const { musicUrl: generatedMusicUrl, provider, durationMs } = await runV7MusicStage({ brief })
    if (!generatedMusicUrl?.trim()) {
      throw new V7ProviderNotAvailableError({
        provider: provider ?? 'music',
        stage: 'music',
        requiredEnv: ['MUSICGEN_URL', 'MVP_ROYALTY_FREE_MUSIC_URL', 'V3_MUSIC_URL'],
        message: 'Music stage completed without a music track URL.',
      })
    }
    const musicUrl = await persistV7AudioUrl({
      supabase,
      userId,
      productionId,
      audioUrl: generatedMusicUrl,
      kind: 'music',
    })
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
    const audiogenConfigured = Boolean(process.env.AUDIOGEN_URL?.trim())
    if (audiogenConfigured) {
      assertV7SoundProviderConfigured()
    }
    const { sfx, provider, durationMs } = await runV7SoundStage({ script, storyboard, snapshot })
    if (audiogenConfigured && (!Array.isArray(sfx) || sfx.length === 0)) {
      throw new V7ProviderNotAvailableError({
        provider: provider ?? 'sound-design',
        stage: 'sound',
        requiredEnv: ['AUDIOGEN_URL'],
        message: 'Sound stage completed without environment sound effects.',
      })
    }
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: { sfx: sfx ?? [], provider, durationMs },
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
        editDurationSec: timeline.durationSec,
        editSceneCount: timeline.sceneCount,
        editShotCount: timeline.shotCount,
      },
    })
    const captions = timeline.scenes.flatMap((scene) => scene.captions ?? []).filter((cue) => cue.text.trim())
    await upsertV7Stage(supabase, {
      productionId,
      stage,
      status: 'completed',
      output: {
        durationMs,
        captions,
        sceneCount: timeline.sceneCount,
        shotCount: timeline.shotCount,
        durationSec: timeline.durationSec,
      },
    })
    return
  }

  if (stage === 'quality') {
    const freshSnapshot = await getV7Production(supabase, productionId, userId)
    if (!freshSnapshot) throw new Error('Snapshot missing before quality check')
    const { passed, issues, durationMs } = await runV7QualityStage({
      snapshot: freshSnapshot,
      supabase,
    })
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

export async function selectV7ProductionConcept(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  conceptIndex: number
}): Promise<V7AdvanceSnapshot> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) throw new Error('Production not found')

  if (snapshot.production.user_id !== params.userId) {
    throw new Error('Forbidden')
  }

  const selection = readConceptSelectionState(snapshot.production.timeline_json)
  if (!selection?.awaiting || selection.concepts.length === 0) {
    throw new Error('Concept selection is not pending for this production')
  }

  const concept = validateConceptIndex(selection.concepts, params.conceptIndex)
  if (!concept) throw new Error('Invalid concept selection')

  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const mergedBrief = applySelectedConceptToBrief(brief, concept)
  const timeline = mergeConceptSelectionTimeline(snapshot.production.timeline_json, {
    awaiting: false,
    selectedIndex: params.conceptIndex,
    selectedAt: new Date().toISOString(),
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    title: mergedBrief.title,
    status: 'producing',
    current_stage: 'research',
    creative_brief: mergedBrief,
    timeline_json: timeline,
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'research',
    status: 'queued',
    input: { brief: mergedBrief, selectedConcept: concept },
  })

  return advanceV7Production({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
  })
}
