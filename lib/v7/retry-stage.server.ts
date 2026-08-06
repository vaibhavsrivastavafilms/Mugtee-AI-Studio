import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production, updateV7Production, upsertV7Stage } from '@/lib/v7/db.server'
import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import { findFirstFailedStage, releaseProductionLock } from '@/lib/v7/pipeline-sync.server'
import type { V7ProductionSnapshot, V7StageId } from '@/types/v7/production'

export async function retryV7FailedStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  stage?: V7StageId
}): Promise<V7ProductionSnapshot> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) throw new Error('Production not found')

  const failed = snapshot.stages.filter((s) => s.status === 'failed')
  if (failed.length === 0) {
    throw new Error('No failed stage to retry')
  }

  const target =
    (params.stage ? failed.find((s) => s.stage === params.stage) : findFirstFailedStage(failed)) ??
    failed[0]

  await releaseProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    token: null,
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: target.stage as V7StageId,
    status: 'queued',
    error: null,
    output: null,
  })

  for (const stageId of V7_RUNNABLE_STAGES) {
    const idx = V7_RUNNABLE_STAGES.indexOf(target.stage as V7StageId)
    const stageIndex = V7_RUNNABLE_STAGES.indexOf(stageId)
    if (stageIndex <= idx) continue
    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage: stageId,
      status: 'queued',
      error: null,
      output: null,
    })
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'producing',
    current_stage: target.stage as V7StageId,
  })

  const refreshed = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!refreshed) throw new Error('Production not found after retry reset')
  return refreshed
}
