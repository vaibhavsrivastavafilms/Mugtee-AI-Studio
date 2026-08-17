import type { V7ProductionSnapshot, V7StageId } from '@/types/v7/production'

export function formatStageDurationLabel(row: V7ProductionSnapshot['stages'][number] | undefined): string | null {
  if (!row) return null

  const outputDurationMs = row.output?.durationMs
  if (typeof outputDurationMs === 'number' && outputDurationMs > 0) {
    return `Duration: ${(outputDurationMs / 1000).toFixed(1)}s`
  }

  if (row.started_at && row.completed_at) {
    const start = Date.parse(row.started_at)
    const end = Date.parse(row.completed_at)
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return `Duration: ${((end - start) / 1000).toFixed(1)}s`
    }
  }

  return null
}

export function resolveStaleHint(stageId: V7StageId | 'final'): string | null {
  if (stageId === 'script') return 'Edited'
  if (stageId === 'render' || stageId === 'export' || stageId === 'final') return 'Based on previous script'
  return 'Needs update'
}

export const WORKSPACE_REVIEW_STAGE_ORDER: Array<V7StageId | 'final'> = [
  'idea',
  'research',
  'creative',
  'script',
  'voice',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
  'final',
]
