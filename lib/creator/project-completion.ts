import { isFinishedProjectStatus } from '@/lib/cinematic/project-status'

const STATUS_PROGRESS: Record<string, number> = {
  idle: 0,
  draft: 10,
  create: 10,
  editing: 35,
  generating: 35,
  preview: 55,
  reviewing: 55,
  director: 50,
  scenes: 65,
  voiceover: 75,
  compile: 85,
  completed: 95,
  complete: 95,
  exported: 100,
}

/** Map project status to a completion percentage for the Continue Creating widget. */
export function projectCompletionPercent(status: string | null | undefined): number {
  if (!status) return 0
  if (isFinishedProjectStatus(status)) return status === 'exported' ? 100 : 95
  return STATUS_PROGRESS[status] ?? 20
}

export function completionLabel(percent: number): string {
  if (percent >= 100) return 'Exported'
  if (percent >= 85) return 'Almost there'
  if (percent >= 55) return 'In review'
  if (percent >= 35) return 'In motion'
  if (percent >= 10) return 'Drafting'
  return 'Starting'
}
