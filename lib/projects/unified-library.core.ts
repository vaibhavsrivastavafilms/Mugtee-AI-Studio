import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'
import {
  isProductionCancelled,
  isProjectClosed,
  readWorkspaceState,
  resolveWorkspaceLifecycleStatus,
} from '@/lib/v7/workspace/workspace-state.core'
import type {
  UnifiedLibraryPipelineFilter,
  UnifiedLibrarySort,
  UnifiedLibraryStatusFilter,
  UnifiedProjectActions,
  UnifiedProjectItem,
  UnifiedProjectPipeline,
  UnifiedProjectStatus,
} from '@/lib/projects/unified-library.types'
import type { V7ProductionRow } from '@/types/v7/production'

export function mapV7UnifiedStatus(
  production: Pick<V7ProductionRow, 'status' | 'reel_url' | 'export_status' | 'timeline_json'>,
  hasFailedStage: boolean
): UnifiedProjectStatus {
  const workspace = readWorkspaceState(production.timeline_json)
  if (isProjectClosed(workspace)) return 'closed'
  if (isProductionCancelled(workspace)) return 'cancelled'

  const lifecycle = resolveWorkspaceLifecycleStatus({
    production,
    stages: [],
    workspace,
  })
  if (lifecycle === 'updated') return 'updated'
  if (lifecycle === 'stale') return 'updated'

  if (v7HasDeliverableMedia(production)) return 'completed'
  if (production.status === 'completed') return 'completed'
  if (hasFailedStage || production.status === 'failed') return 'failed'
  if (production.status === 'producing' || production.status === 'planning') return 'running'
  return 'draft'
}

export function buildProjectActions(params: {
  status: UnifiedProjectStatus
  deliverable: boolean
  movUrl: string | null
  creatorPackUrl: string | null
  retryAvailable: boolean
}): UnifiedProjectActions {
  return {
    open: params.status !== 'closed',
    continue:
      params.status === 'running' ||
      params.status === 'failed' ||
      params.status === 'draft' ||
      params.status === 'cancelled',
    retry: params.retryAvailable && params.status === 'failed',
    watch: params.deliverable,
    download: params.deliverable,
    downloadMov: params.deliverable && Boolean(params.movUrl?.trim()),
    creatorPack: params.deliverable && Boolean(params.creatorPackUrl?.trim()),
    reopen: params.status === 'closed',
    reviewChanges: params.status === 'updated',
  }
}

export function formatAspectRatioLabel(raw: string | undefined | null): string | null {
  const value = raw?.trim()
  if (!value) return null
  return value
}

export function formatProjectStatusLabel(item: Pick<
  UnifiedProjectItem,
  'status' | 'statusLabel' | 'currentStage'
>): string {
  switch (item.status) {
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Generation failed'
    case 'running':
      return item.currentStage ?? 'In progress'
    case 'draft':
      return 'Waiting'
    case 'closed':
      return 'Closed'
    case 'cancelled':
      return 'Cancelled'
    case 'updated':
      return 'Updated — review changes'
    case 'paused':
      return item.currentStage ?? 'Production paused'
  }
}

export function matchesSearch(item: UnifiedProjectItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [item.title, item.prompt, item.id].join(' ').toLowerCase().includes(q)
}

export function matchesStatusFilter(
  item: UnifiedProjectItem,
  filter: UnifiedLibraryStatusFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'in_progress') {
    return item.status === 'running' || item.status === 'paused' || item.status === 'draft'
  }
  if (filter === 'closed') return item.status === 'closed'
  return item.status === filter
}

export function matchesPipelineFilter(
  item: UnifiedProjectItem,
  filter: UnifiedLibraryPipelineFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'v7') return item.type === 'v7'
  if (filter === 'quick_cut') return item.type === 'quick_cut'
  if (filter === 'cinematic') return item.type === 'cinematic'
  if (filter === 'v3') return item.type === 'v3'
  return true
}

export function sortProjects(items: UnifiedProjectItem[], sort: UnifiedLibrarySort): UnifiedProjectItem[] {
  const copy = [...items]
  switch (sort) {
    case 'newest':
      copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      break
    case 'oldest':
      copy.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      break
    case 'name_asc':
      copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
      break
    case 'recently_completed':
      copy.sort((a, b) => {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : 0
        const bTime = b.completedAt ? Date.parse(b.completedAt) : 0
        if (aTime !== bTime) return bTime - aTime
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      })
      break
    case 'recently_updated':
    default:
      copy.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      break
  }
  return copy
}

export function pipelineLabel(type: UnifiedProjectPipeline): string {
  switch (type) {
    case 'v7':
      return 'V7 Studio'
    case 'quick_cut':
      return 'Quick Cut'
    case 'cinematic':
      return 'Cinematic'
    case 'v3':
      return 'V3 Legacy'
  }
}

export function unifiedStatusLabel(status: UnifiedProjectStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'running':
      return 'In progress'
    case 'paused':
      return 'Production paused'
    case 'failed':
      return 'Generation failed'
    case 'draft':
      return 'Waiting'
    case 'closed':
      return 'Closed'
    case 'cancelled':
      return 'Cancelled'
    case 'updated':
      return 'Updated'
  }
}
