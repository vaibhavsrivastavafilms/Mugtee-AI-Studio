import 'server-only'

/** Structured MP4 export pipeline checkpoints for Vercel / local logs. */
export type ExportApiCheckpoint =
  | 'request_received'
  | 'payload_validated'
  | 'storyboard_processing'
  | 'image_assets_loaded'
  | 'queue_start'
  | 'remotion_start'
  | 'ffmpeg_start'
  | 'upload_start'
  | 'zip_generation'
  | 'completed'
  | 'background_scheduled'

export function exportApiCheckpoint(
  step: ExportApiCheckpoint,
  payload?: Record<string, unknown>
): void {
  console.log('[EXPORT API] step:', step, payload ?? {})
}

export function exportApiFatal(err: unknown, context?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error('[EXPORT API FATAL]', { message, stack, ...context })
}

export function remotionCheckpoint(
  event: 'composition_lookup' | 'composition_found' | 'composition_missing' | 'render_media_start' | 'render_media_done' | 'bundle_start' | 'bundle_done',
  payload?: Record<string, unknown>
): void {
  console.log('[REMOTION]', event, payload ?? {})
}

export function ffmpegCheckpoint(
  event: 'loaded' | 'start' | 'stderr' | 'failed' | 'done',
  payload?: Record<string, unknown>
): void {
  console.log('[FFMPEG]', event, payload ?? {})
}
