import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production, updateV7Production, upsertV7Stage } from '@/lib/v7/db.server'
import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import { logV7StageError, V7StageExecutionError } from '@/lib/v7/api-errors.server'
import { advanceV7Production } from '@/lib/v7/orchestrator.server'
import { detectProductionStateDrift } from '@/lib/v7/pipeline-state.core'
import {
  findFirstFailedStage,
  releaseProductionLock,
  shouldDrivePipeline,
} from '@/lib/v7/pipeline-sync.server'
import {
  mergeWorkspaceState,
  recordStageRetryAttempt,
} from '@/lib/v7/workspace/workspace-state.core'
import type { V7ProductionSnapshot, V7StageId } from '@/types/v7/production'

function resolveFailureProvider(error: unknown): string | undefined {
  if (error instanceof V7StageExecutionError && error.provider) return error.provider
  const cause =
    error instanceof V7StageExecutionError && error.cause ? error.cause : error
  if (cause && typeof cause === 'object' && 'provider' in cause) {
    const provider = (cause as { provider?: unknown }).provider
    if (typeof provider === 'string' && provider.trim()) return provider
  }
  if (cause && typeof cause === 'object' && 'failures' in cause) {
    const failures = (cause as { failures?: Array<{ provider?: string }> }).failures
    const last = failures?.[failures.length - 1]
    if (last?.provider) return last.provider
  }
  return undefined
}

export async function retryV7FailedStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  stage?: V7StageId
}): Promise<V7ProductionSnapshot> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) throw new Error('Production not found')

  const failed = snapshot.stages.filter((s) => s.status === 'failed')
  const drift = detectProductionStateDrift(snapshot)

  if (failed.length === 0) {
    if (!drift.recoverable || !drift.resumeStage) {
      throw new Error('No failed stage to retry')
    }

    console.info('[v7-retry] reconciling production state drift', {
      productionId: params.productionId,
      resumeStage: drift.resumeStage,
      lastCompletedStage: drift.lastCompletedStage,
    })

    await releaseProductionLock({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      token: null,
    })

    const timelineAfterRetry = recordStageRetryAttempt(
      mergeWorkspaceState(snapshot.production.timeline_json, { cancelledAt: null }),
      { stageId: drift.resumeStage, error: null }
    )

    await updateV7Production(params.supabase, params.productionId, params.userId, {
      status: 'producing',
      current_stage: drift.resumeStage,
      timeline_json: timelineAfterRetry,
    })

    let current = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!current) throw new Error('Production not found after drift reconciliation')

    const maxAdvances = V7_RUNNABLE_STAGES.length + 2
    for (let attempt = 0; attempt < maxAdvances; attempt++) {
      if (!shouldDrivePipeline(current)) break

      try {
        await advanceV7Production({
          supabase: params.supabase,
          productionId: params.productionId,
          userId: params.userId,
        })
      } catch (error) {
        logV7StageError({
          stage: drift.resumeStage!,
          productionId: params.productionId,
          provider: resolveFailureProvider(error),
          error,
        })

        const afterFailure = await getV7Production(
          params.supabase,
          params.productionId,
          params.userId
        )
        if (afterFailure) current = afterFailure

        if (error instanceof V7StageExecutionError) throw error
        throw new V7StageExecutionError(drift.resumeStage!, error, {
          productionId: params.productionId,
          provider: resolveFailureProvider(error),
        })
      }

      const refreshed = await getV7Production(params.supabase, params.productionId, params.userId)
      if (!refreshed) throw new Error('Production not found after drift resume advance')
      current = refreshed

      if (findFirstFailedStage(current.stages)) break
      if (current.production.status === 'completed' || current.production.status === 'failed') {
        break
      }
    }

    return current
  }

  const target =
    (params.stage ? failed.find((s) => s.stage === params.stage) : findFirstFailedStage(failed)) ??
    failed[0]

  const retryStage = target.stage as V7StageId
  const priorError = target.error

  console.info('[v7-retry] restoring checkpoint', {
    productionId: params.productionId,
    retryStage,
    failedStages: failed.map((row) => row.stage),
  })

  await releaseProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    token: null,
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: retryStage,
    status: 'queued',
    error: null,
    output: null,
  })

  const targetIndex = V7_RUNNABLE_STAGES.indexOf(retryStage)
  for (const stageId of V7_RUNNABLE_STAGES) {
    const stageIndex = V7_RUNNABLE_STAGES.indexOf(stageId)
    if (stageIndex <= targetIndex) continue
    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage: stageId,
      status: 'queued',
      error: null,
      output: null,
    })
  }

  // Explicit Retry is the only path that may clear failed → queued and lift investigation freezes.
  const timelineAfterRetry = recordStageRetryAttempt(
    mergeWorkspaceState(snapshot.production.timeline_json, { cancelledAt: null }),
    { stageId: retryStage, error: priorError }
  )

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'producing',
    current_stage: retryStage,
    timeline_json: timelineAfterRetry,
  })

  let current = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!current) throw new Error('Production not found after retry reset')

  console.info('[v7-retry] checkpoint restored', {
    productionId: params.productionId,
    retryStage,
    status: current.production.status,
  })

  const maxAdvances = V7_RUNNABLE_STAGES.length + 2

  for (let attempt = 0; attempt < maxAdvances; attempt++) {
    if (!shouldDrivePipeline(current)) break

    console.info('[v7-retry] advancing pipeline', {
      productionId: params.productionId,
      retryStage,
      attempt: attempt + 1,
      currentStage: current.production.current_stage,
    })

    try {
      await advanceV7Production({
        supabase: params.supabase,
        productionId: params.productionId,
        userId: params.userId,
      })
    } catch (error) {
      logV7StageError({
        stage: retryStage,
        productionId: params.productionId,
        provider: resolveFailureProvider(error),
        error,
      })

      const afterFailure = await getV7Production(
        params.supabase,
        params.productionId,
        params.userId
      )
      if (afterFailure) current = afterFailure

      if (error instanceof V7StageExecutionError) throw error
      throw new V7StageExecutionError(retryStage, error, {
        productionId: params.productionId,
        provider: resolveFailureProvider(error),
      })
    }

    const refreshed = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!refreshed) throw new Error('Production not found after retry advance')
    current = refreshed

    if (findFirstFailedStage(current.stages)) break
    if (current.production.status === 'completed' || current.production.status === 'failed') {
      break
    }
  }

  console.info('[v7-retry] finished', {
    productionId: params.productionId,
    retryStage,
    status: current.production.status,
    currentStage: current.production.current_stage,
    failedStage: findFirstFailedStage(current.stages)?.stage ?? null,
  })

  return current
}
