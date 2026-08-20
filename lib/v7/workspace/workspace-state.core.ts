import type { V7ProductionRow, V7ProductionSnapshot, V7StageRow } from '@/types/v7/production'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'

export type WorkspaceLifecycleStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'closed'
  | 'stale'
  | 'updated'

export type StaleStageMarker = {
  stageId: string
  label: string
  reason: string
  staleAt: string
  sceneId?: string
  sceneNumber?: number
}

export type ScriptVersionRecord = {
  id: string
  savedAt: string
  summary?: string
}

export type PreservedDeliverableRefs = Pick<
  V7ProductionRow,
  | 'export_status'
  | 'reel_url'
  | 'thumbnail_url'
  | 'mov_url'
  | 'creator_pack_url'
  | 'voice_url'
  | 'music_url'
>

export type StageRetryRecord = {
  count: number
  lastAt: string
  lastError?: string | null
}

export type V7WorkspaceTimelineState = {
  cancelledAt?: string | null
  closedAt?: string | null
  staleStages?: Record<string, StaleStageMarker>
  scriptVersions?: ScriptVersionRecord[]
  currentScriptVersionId?: string | null
  lastEditAt?: string | null
  lastEditType?: 'script' | 'voice' | 'scene' | 'continuation' | null
  /** Snapshot taken before a script edit so Keep Existing can restore cleared refs. */
  preservedDeliverables?: PreservedDeliverableRefs | null
  keptExistingOutputsAt?: string | null
  /** Explicit user retry attempts per stage (observability; not auto-incremented by reconcile). */
  stageRetries?: Record<string, StageRetryRecord>
}

const WORKSPACE_KEY = 'workspace'

export function readWorkspaceState(
  timelineJson: Record<string, unknown> | null | undefined
): V7WorkspaceTimelineState {
  if (!timelineJson || typeof timelineJson !== 'object') return {}
  const raw = timelineJson[WORKSPACE_KEY]
  if (!raw || typeof raw !== 'object') return {}
  return raw as V7WorkspaceTimelineState
}

export function mergeWorkspaceState(
  timelineJson: Record<string, unknown> | null | undefined,
  patch: Partial<V7WorkspaceTimelineState>
): Record<string, unknown> {
  const base =
    timelineJson && typeof timelineJson === 'object' ? { ...timelineJson } : ({} as Record<string, unknown>)
  const current = readWorkspaceState(base)
  base[WORKSPACE_KEY] = { ...current, ...patch }
  return base
}

export function readStageRetryRecord(
  timelineJson: Record<string, unknown> | null | undefined,
  stageId: string
): StageRetryRecord | null {
  const record = readWorkspaceState(timelineJson).stageRetries?.[stageId]
  if (!record || typeof record.count !== 'number') return null
  return record
}

/** Record an explicit user retry (failed → queued). Does not clear cancelledAt by itself. */
export function recordStageRetryAttempt(
  timelineJson: Record<string, unknown> | null | undefined,
  params: { stageId: string; error?: string | null; at?: string }
): Record<string, unknown> {
  const workspace = readWorkspaceState(timelineJson)
  const previous = workspace.stageRetries?.[params.stageId]
  const next: StageRetryRecord = {
    count: (previous?.count ?? 0) + 1,
    lastAt: params.at ?? new Date().toISOString(),
    lastError: params.error ?? previous?.lastError ?? null,
  }
  return mergeWorkspaceState(timelineJson, {
    stageRetries: {
      ...(workspace.stageRetries ?? {}),
      [params.stageId]: next,
    },
  })
}

export function isProductionCancelled(workspace: V7WorkspaceTimelineState): boolean {
  return Boolean(workspace.cancelledAt?.trim())
}

export function isProjectClosed(workspace: V7WorkspaceTimelineState): boolean {
  return Boolean(workspace.closedAt?.trim())
}

function hasFailedStage(stages: V7StageRow[]): boolean {
  return stages.some((row) => row.status === 'failed')
}

function hasStaleMarkers(workspace: V7WorkspaceTimelineState): boolean {
  return Object.keys(workspace.staleStages ?? {}).length > 0
}

function hasRecentEdit(workspace: V7WorkspaceTimelineState): boolean {
  return Boolean(workspace.lastEditAt?.trim())
}

/** User-facing workspace lifecycle — does not replace v7_productions.status. */
export function resolveWorkspaceLifecycleStatus(params: {
  production: Pick<V7ProductionRow, 'status' | 'reel_url' | 'export_status'>
  stages: V7StageRow[]
  workspace: V7WorkspaceTimelineState
}): WorkspaceLifecycleStatus {
  const { production, stages, workspace } = params

  if (isProjectClosed(workspace)) return 'closed'
  if (isProductionCancelled(workspace)) return 'cancelled'
  if (hasFailedStage(stages) || production.status === 'failed') return 'failed'

  if (hasStaleMarkers(workspace)) return 'stale'
  if (hasRecentEdit(workspace) && v7HasDeliverableMedia(production)) return 'updated'

  if (v7HasDeliverableMedia(production) || production.status === 'completed') return 'completed'
  if (production.status === 'producing' || production.status === 'planning') return 'running'
  return 'queued'
}

export function workspaceLifecycleLabel(status: WorkspaceLifecycleStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'running':
      return 'In progress'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    case 'closed':
      return 'Closed'
    case 'stale':
      return 'Needs review'
    case 'updated':
      return 'Updated'
  }
}

export function staleStageList(workspace: V7WorkspaceTimelineState): StaleStageMarker[] {
  const entries = workspace.staleStages ?? {}
  return Object.values(entries).sort((a, b) => a.label.localeCompare(b.label))
}

export function markStagesStale(params: {
  workspace: V7WorkspaceTimelineState
  markers: StaleStageMarker[]
}): V7WorkspaceTimelineState {
  const staleStages = { ...(params.workspace.staleStages ?? {}) }
  for (const marker of params.markers) {
    const key = marker.sceneNumber != null ? `${marker.stageId}:${marker.sceneNumber}` : marker.stageId
    staleStages[key] = marker
  }
  return { ...params.workspace, staleStages }
}

export function clearStaleStages(
  workspace: V7WorkspaceTimelineState,
  stageIds?: string[]
): V7WorkspaceTimelineState {
  if (!stageIds || stageIds.length === 0) {
    return { ...workspace, staleStages: {} }
  }
  const staleStages = { ...(workspace.staleStages ?? {}) }
  for (const key of Object.keys(staleStages)) {
    if (stageIds.some((id) => key === id || key.startsWith(`${id}:`))) {
      delete staleStages[key]
    }
  }
  return { ...workspace, staleStages }
}

export function readWorkspaceFromSnapshot(snapshot: V7ProductionSnapshot): V7WorkspaceTimelineState {
  return readWorkspaceState(snapshot.production.timeline_json)
}
