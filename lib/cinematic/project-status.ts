import type { CinematicProjectStatus } from '@/stores/cinematic-project'

/** Statuses shown in Recent Generations gallery. */
export const FINISHED_PROJECT_STATUSES = ['completed', 'exported', 'complete'] as const

/** Map legacy DB status values to the unified workflow vocabulary. */
export function normalizeProjectStatus(status: string | null | undefined): CinematicProjectStatus {
  switch (status) {
    case 'draft':
    case 'editing':
    case 'reviewing':
    case 'completed':
    case 'exported':
      return status
    case 'preview':
      return 'reviewing'
    case 'complete':
      return 'completed'
    case 'create':
      return 'draft'
    case 'generating':
      return 'editing'
    default:
      return (status as CinematicProjectStatus) || 'draft'
  }
}

export function isFinishedProjectStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return (FINISHED_PROJECT_STATUSES as readonly string[]).includes(status)
}

/** Status while generation pipeline is running. */
export function editingStatus(): CinematicProjectStatus {
  return 'editing'
}

/** Status when preview is ready but not yet exported. */
export function reviewingStatus(): CinematicProjectStatus {
  return 'reviewing'
}

/** Status when export package or MP4 is ready. */
export function completedStatus(): CinematicProjectStatus {
  return 'completed'
}

/** Status after user downloads or publishes. */
export function exportedStatus(): CinematicProjectStatus {
  return 'exported'
}
