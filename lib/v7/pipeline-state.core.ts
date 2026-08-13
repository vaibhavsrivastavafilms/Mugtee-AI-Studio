import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import type { V7ProductionSnapshot, V7StageId, V7StageRow } from '@/types/v7/production'

export function stageRowHasOutput(row: V7StageRow | undefined): boolean {
  if (!row || row.status !== 'completed') return false
  const output = row.output
  return output != null && typeof output === 'object' && Object.keys(output).length > 0
}

export function getNextRunnableStageId(completedStage: V7StageId): V7StageId | null {
  const idx = V7_RUNNABLE_STAGES.indexOf(completedStage)
  if (idx < 0) return null
  return V7_RUNNABLE_STAGES[idx + 1] ?? null
}

export function findLastContiguousCompletedRunnableStage(
  stages: V7StageRow[]
): V7StageId | null {
  let lastCompleted: V7StageId | null = null

  for (const stageId of V7_RUNNABLE_STAGES) {
    const row = stages.find((entry) => entry.stage === stageId)
    if (row?.status === 'completed' && stageRowHasOutput(row)) {
      lastCompleted = stageId
      continue
    }
    break
  }

  return lastCompleted
}

export type V7ProductionStateDrift = {
  recoverable: boolean
  resumeStage: V7StageId | null
  lastCompletedStage: V7StageId | null
}

/** Detect failed production with valid completed checkpoint + queued next stage (no failed rows). */
export function detectProductionStateDrift(snapshot: V7ProductionSnapshot): V7ProductionStateDrift {
  if (snapshot.production.status !== 'failed') {
    return { recoverable: false, resumeStage: null, lastCompletedStage: null }
  }

  const hasFailedStage = snapshot.stages.some((row) => row.status === 'failed')
  if (hasFailedStage) {
    return { recoverable: false, resumeStage: null, lastCompletedStage: null }
  }

  const lastCompletedStage = findLastContiguousCompletedRunnableStage(snapshot.stages)
  if (!lastCompletedStage) {
    return { recoverable: false, resumeStage: null, lastCompletedStage: null }
  }

  const resumeStage = getNextRunnableStageId(lastCompletedStage)
  if (!resumeStage) {
    return { recoverable: false, resumeStage: null, lastCompletedStage }
  }

  const nextRow = snapshot.stages.find((row) => row.stage === resumeStage)
  if (nextRow?.status !== 'queued') {
    return { recoverable: false, resumeStage: null, lastCompletedStage }
  }

  return { recoverable: true, resumeStage, lastCompletedStage }
}

export function resolveProductionFieldsAfterStageSuccess(params: {
  completedStage: V7StageId
  stages: V7StageRow[]
}): { status: 'producing'; current_stage: V7StageId } {
  const nextStage = getNextRunnableStageId(params.completedStage)
  if (nextStage) {
    const nextRow = params.stages.find((row) => row.stage === nextStage)
    if (nextRow?.status === 'queued') {
      return { status: 'producing', current_stage: nextStage }
    }
  }

  return { status: 'producing', current_stage: params.completedStage }
}

export function shouldPreserveCompletedStageFailure(
  stageRow: V7StageRow | undefined
): boolean {
  return stageRowHasOutput(stageRow)
}
