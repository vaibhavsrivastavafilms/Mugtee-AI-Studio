import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import type {
  V7ProductionRow,
  V7ProductionSnapshot,
  V7StageId,
  V7StageRow,
} from '@/types/v7/production'

export type V7PipelineLock = {
  locked: boolean
  stage?: V7StageId
  since?: string
  token?: string
}

const STALE_RUNNING_MS = 30 * 60 * 1000
const TEXT_STALE_RUNNING_MS = 150_000
/** Voice TTS can exceed text-stage budgets; recover zombies after worker timeout without interrupting synthesis. */
const VOICE_STALE_RUNNING_MS = 6 * 60 * 1000
const IMAGE_STALE_RUNNING_MS = 8 * 60 * 1000
const ANIMATION_STALE_RUNNING_MS = 10 * 60 * 1000
const RENDER_STALE_RUNNING_MS = 6 * 60 * 1000
/** Lock acquired but worker never marked the stage running — recover after this grace. */
export const V7_ORPHAN_PIPELINE_LOCK_GRACE_MS = 120_000

const TEXT_STALE_STAGES = new Set<V7StageId>([
  'idea',
  'research',
  'creative',
  'script',
  'character',
  'world',
  'storyboard',
])

export function getV7StaleRunningMs(stage: V7StageId): number {
  if (stage === 'idea') return TEXT_STALE_RUNNING_MS
  if (stage === 'voice') return VOICE_STALE_RUNNING_MS
  if (stage === 'image') return IMAGE_STALE_RUNNING_MS
  if (stage === 'animation') return ANIMATION_STALE_RUNNING_MS
  if (stage === 'render') return RENDER_STALE_RUNNING_MS
  if (TEXT_STALE_STAGES.has(stage)) return TEXT_STALE_RUNNING_MS
  return STALE_RUNNING_MS
}

/**
 * Stages that may be auto-reset to `queued` during pipeline integrity reconcile.
 * Genuine `failed` rows must never be cleared automatically — only an explicit
 * Retry action may move failed → queued.
 */
export function isAutoRequeueableStageStatus(status: V7StageRow['status']): boolean {
  return status === 'completed' || status === 'running'
}

/** Stale render workers must land in `failed`, not `queued`, to avoid silent retry loops. */
export function shouldFailStaleRunningStage(stage: V7StageId): boolean {
  return stage === 'render'
}

export const V7_STALE_RENDER_FAILURE_MESSAGE =
  'Render worker timed out or was interrupted before completion. Retry Render to try again.'

export function readV7PipelineLock(
  timeline: Record<string, unknown> | null | undefined
): V7PipelineLock | null {
  const raw = timeline?.pipeline_lock
  if (!raw || typeof raw !== 'object') return null
  return raw as V7PipelineLock
}

export function isV7PipelineLockActive(
  lock: V7PipelineLock | null,
  now = Date.now()
): boolean {
  if (!lock?.locked) return false
  const since = lock.since ? Date.parse(lock.since) : 0
  if (!since) return false
  const maxMs =
    lock.stage && V7_RUNNABLE_STAGES.includes(lock.stage)
      ? getV7StaleRunningMs(lock.stage)
      : STALE_RUNNING_MS
  return now - since <= maxMs
}

/** Locked with no matching live worker — safe to recover after grace. */
export function isV7OrphanPipelineLock(params: {
  lock: V7PipelineLock | null
  runningStage: V7StageRow | null
  now?: number
}): boolean {
  const { lock, runningStage } = params
  const now = params.now ?? Date.now()
  if (!lock?.locked) return false
  if (runningStage?.status === 'running' && runningStage.stage === lock.stage) {
    return false
  }
  const since = lock.since ? Date.parse(lock.since) : 0
  if (!since) return true
  return now - since > V7_ORPHAN_PIPELINE_LOCK_GRACE_MS
}

export function shouldRecoverV7PipelineLock(params: {
  lock: V7PipelineLock | null
  runningStage: V7StageRow | null
  now?: number
}): boolean {
  const { lock } = params
  if (!lock?.locked) return false
  if (isV7OrphanPipelineLock(params)) return true
  return !isV7PipelineLockActive(lock, params.now)
}

/** True only when a lock represents live in-flight worker execution (not stale/orphan). */
export function isLiveGlobalPipelineLock(params: {
  lock: V7PipelineLock | null
  runningStage: V7StageRow | null
  now?: number
}): boolean {
  if (!params.lock?.locked) return false
  if (!isV7PipelineLockActive(params.lock, params.now)) return false
  if (shouldRecoverV7PipelineLock(params)) return false
  return true
}

export function stageRowHasOutput(row: V7StageRow | undefined): boolean {
  if (!row || row.status !== 'completed') return false
  const output = row.output
  return output != null && typeof output === 'object' && Object.keys(output).length > 0
}

/** Queued row left over after failed/completed reset — blocks trustworthy progress signals. */
export function isOrphanQueuedStageRow(row: V7StageRow | undefined): boolean {
  if (!row || row.status !== 'queued') return false
  if (!row.completed_at) return false
  return !stageRowHasOutput(row)
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

/** Export stage checkpoint + persisted reel — authoritative finalization signal. */
export function isV7ExportStageFinalized(snapshot: V7ProductionSnapshot): boolean {
  const reelUrl = snapshot.production.reel_url?.trim()
  if (!reelUrl) return false
  if (snapshot.production.export_status !== 'completed') return false

  const exportStage = snapshot.stages.find((row) => row.stage === 'export')
  if (exportStage?.status !== 'completed') return false
  return stageRowHasOutput(exportStage)
}

/** Production still marked producing after export genuinely finalized. */
export function detectProductionCompletionDrift(snapshot: V7ProductionSnapshot): boolean {
  if (snapshot.production.status === 'completed') return false
  return isV7ExportStageFinalized(snapshot)
}

export type V7ProductionStatusPatch = {
  status: 'producing' | 'completed'
  current_stage: V7StageId
}

export function resolveProductionFieldsAfterStageSuccess(params: {
  completedStage: V7StageId
  stages: V7StageRow[]
  production?: Pick<V7ProductionRow, 'reel_url' | 'export_status'>
}): V7ProductionStatusPatch {
  if (params.completedStage === 'export') {
    const exportStage = params.stages.find((row) => row.stage === 'export')
    if (
      exportStage?.status === 'completed' &&
      stageRowHasOutput(exportStage) &&
      params.production?.export_status === 'completed' &&
      params.production.reel_url?.trim()
    ) {
      return { status: 'completed', current_stage: 'export' }
    }
  }

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

function completedStageMediaUrl(
  stages: Array<Pick<V7StageRow, 'stage' | 'status' | 'output'>>,
  stage: V7StageId,
  key: 'voiceUrl' | 'musicUrl'
): string {
  const row = stages.find((item) => item.stage === stage)
  if (row?.status !== 'completed' || !row.output || typeof row.output !== 'object') return ''
  const value = (row.output as Record<string, unknown>)[key]
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (!url || url.startsWith('data:')) return ''
  return url
}

/** Copy completed stage media URLs onto the production row when persistence raced or was omitted. */
export function missingDeliverableUrlPatch(snapshot: {
  production: Pick<V7ProductionRow, 'voice_url' | 'music_url'>
  stages: Array<Pick<V7StageRow, 'stage' | 'status' | 'output'>>
}): { voice_url?: string; music_url?: string } {
  const patch: { voice_url?: string; music_url?: string } = {}
  const voiceUrl = completedStageMediaUrl(snapshot.stages, 'voice', 'voiceUrl')
  if (voiceUrl && !snapshot.production.voice_url?.trim()) patch.voice_url = voiceUrl
  const musicUrl = completedStageMediaUrl(snapshot.stages, 'music', 'musicUrl')
  if (musicUrl && !snapshot.production.music_url?.trim()) patch.music_url = musicUrl
  return patch
}
