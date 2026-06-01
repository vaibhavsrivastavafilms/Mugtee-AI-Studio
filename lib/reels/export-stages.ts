/** User-facing export pipeline stage labels (poll UI + server job updates). */

export const EXPORT_STAGE_LABELS = {
  preparing: 'Preparing assets…',
  timeline: 'Rendering timeline…',
  encoding: 'Encoding video…',
  uploading: 'Uploading export…',
  finalizing: 'Finalizing…',
  ready: 'Download ready',
  queued: 'Queued…',
  failed: 'Reel export failed',
} as const

export type ExportStageKey = keyof typeof EXPORT_STAGE_LABELS

/** Map DB reel_status → progress + label for serverless poll fallback. */
export const REEL_STATUS_PROGRESS: Record<
  string,
  { progress: number; label: string; status: 'queued' | 'rendering' | 'uploading' | 'completed' | 'failed' }
> = {
  pending: { progress: 8, label: EXPORT_STAGE_LABELS.preparing, status: 'queued' },
  queued: { progress: 10, label: EXPORT_STAGE_LABELS.queued, status: 'queued' },
  assembling: { progress: 28, label: EXPORT_STAGE_LABELS.timeline, status: 'rendering' },
  rendering: { progress: 58, label: EXPORT_STAGE_LABELS.encoding, status: 'rendering' },
  uploading: { progress: 88, label: EXPORT_STAGE_LABELS.uploading, status: 'uploading' },
  ready: { progress: 96, label: EXPORT_STAGE_LABELS.finalizing, status: 'uploading' },
  completed: { progress: 100, label: EXPORT_STAGE_LABELS.ready, status: 'completed' },
  failed: { progress: 0, label: EXPORT_STAGE_LABELS.failed, status: 'failed' },
}

export function labelForRenderStage(stage: string | undefined): string {
  switch (stage) {
    case 'prepare':
    case 'download_assets':
      return EXPORT_STAGE_LABELS.preparing
    case 'render_segments':
      return EXPORT_STAGE_LABELS.timeline
    case 'assemble':
      return EXPORT_STAGE_LABELS.encoding
    case 'upload':
      return EXPORT_STAGE_LABELS.uploading
    case 'complete':
      return EXPORT_STAGE_LABELS.ready
    default:
      return EXPORT_STAGE_LABELS.preparing
  }
}
