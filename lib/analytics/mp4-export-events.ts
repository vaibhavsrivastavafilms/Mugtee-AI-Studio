/**
 * MP4 export funnel — canonical event names and structured failure codes.
 * Stored in analytics_events.event with metadata JSON (projectId, stage, error_code, …).
 */

import type { AnalyticsMetadata } from '@/lib/analytics/events'
import { trackEvent, type TrackEventPayload } from '@/lib/analytics/track-event'

export const Mp4ExportEvents = {
  USER_SIGNUP: 'user_signup',
  PROJECT_CREATED: 'project_created',
  STORY_GENERATED: 'story_generated',
  STORYBOARD_GENERATED: 'storyboard_generated',
  VOICE_GENERATED: 'voice_generated',
  EXPORT_CLICKED: 'export_clicked',
  MP4_STARTED: 'mp4_started',
  MP4_COMPLETED: 'mp4_completed',
  MP4_DOWNLOADED: 'mp4_downloaded',
  MP4_FAILED: 'mp4_failed',
} as const

export type Mp4ExportEventName = (typeof Mp4ExportEvents)[keyof typeof Mp4ExportEvents]

/** Structured failure codes — never emit "Unknown Error" as error_code. */
export const Mp4ExportErrorCode = {
  EXPORT_TIMEOUT: 'Export Timeout',
  FFMPEG_FAILED: 'FFmpeg Failed',
  MISSING_AUDIO: 'Missing Audio',
  STORAGE_UPLOAD_FAILED: 'Storage Upload Failed',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  QUEUE_FAILED: 'Queue Failed',
  REMOTION_BUNDLE_FAILED: 'Remotion Bundle Failed',
  VIDEO_RENDER_DISABLED: 'VIDEO_RENDER_DISABLED',
  MISSING_SCENES: 'Missing Scenes',
  MISSING_IMAGES: 'Missing Images',
  ASSET_VALIDATION_FAILED: 'Asset Validation Failed',
  DOWNLOAD_FAILED: 'Download Failed',
  RENDER_UNAVAILABLE: 'Render Unavailable',
  EXPORT_REQUEST_FAILED: 'Export Request Failed',
} as const

export type Mp4ExportErrorCodeName =
  (typeof Mp4ExportErrorCode)[keyof typeof Mp4ExportErrorCode]

export type Mp4ExportStage =
  | 'auth'
  | 'validation'
  | 'queue'
  | 'prepare'
  | 'download_assets'
  | 'render_segments'
  | 'assemble'
  | 'upload'
  | 'download'
  | 'client_compile'
  | 'unknown'

export type Mp4FailedPayload = AnalyticsMetadata & {
  projectId?: string | null
  stage: Mp4ExportStage
  error_code: Mp4ExportErrorCodeName
  message: string
  route?: string
}

function normalizeMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim().slice(0, 500)
  if (typeof err === 'string') return err.trim().slice(0, 500)
  return 'Export failed'
}

/** Map raw errors to a stable error_code (never "Unknown Error"). */
export function classifyMp4ExportError(
  err: unknown,
  stage: Mp4ExportStage = 'unknown'
): { error_code: Mp4ExportErrorCodeName; message: string; stage: Mp4ExportStage } {
  const message = normalizeMessage(err)
  const lower = message.toLowerCase()

  if (
    lower.includes('video_render') ||
    lower.includes('not enabled on this server') ||
    lower.includes('mp4 export is disabled')
  ) {
    return {
      error_code: Mp4ExportErrorCode.VIDEO_RENDER_DISABLED,
      message,
      stage,
    }
  }
  if (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('export job expired')
  ) {
    return { error_code: Mp4ExportErrorCode.EXPORT_TIMEOUT, message, stage }
  }
  if (lower.includes('ffmpeg') || lower.includes('chromium')) {
    return { error_code: Mp4ExportErrorCode.FFMPEG_FAILED, message, stage }
  }
  if (
    lower.includes('voice') ||
    lower.includes('narration') ||
    lower.includes('audio') && lower.includes('required')
  ) {
    return { error_code: Mp4ExportErrorCode.MISSING_AUDIO, message, stage }
  }
  if (
    lower.includes('upload') ||
    lower.includes('storage') ||
    lower.includes('bucket')
  ) {
    return { error_code: Mp4ExportErrorCode.STORAGE_UPLOAD_FAILED, message, stage }
  }
  if (lower.includes('memory') || lower.includes('heap')) {
    return { error_code: Mp4ExportErrorCode.MEMORY_LIMIT_EXCEEDED, message, stage }
  }
  if (lower.includes('queue') || lower.includes('queued')) {
    return { error_code: Mp4ExportErrorCode.QUEUE_FAILED, message, stage }
  }
  if (lower.includes('remotion') || lower.includes('bundle')) {
    return { error_code: Mp4ExportErrorCode.REMOTION_BUNDLE_FAILED, message, stage }
  }
  if (
    lower.includes('storyboard scene') ||
    lower.includes('at least one scene') ||
    lower.includes('missing scenes')
  ) {
    return { error_code: Mp4ExportErrorCode.MISSING_SCENES, message, stage }
  }
  if (
    lower.includes('storyboard image') ||
    lower.includes('add storyboard images') ||
    lower.includes('missing export image')
  ) {
    return { error_code: Mp4ExportErrorCode.MISSING_IMAGES, message, stage }
  }
  if (lower.includes('export assets') || lower.includes('unreachable')) {
    return { error_code: Mp4ExportErrorCode.ASSET_VALIDATION_FAILED, message, stage }
  }
  if (lower.includes('download') || lower.includes('empty')) {
    return { error_code: Mp4ExportErrorCode.DOWNLOAD_FAILED, message, stage }
  }
  if (
    lower.includes('render unavailable') ||
    lower.includes('reel export') ||
    lower.includes('temporarily unavailable')
  ) {
    return { error_code: Mp4ExportErrorCode.RENDER_UNAVAILABLE, message, stage }
  }

  return {
    error_code: Mp4ExportErrorCode.EXPORT_REQUEST_FAILED,
    message: message || Mp4ExportErrorCode.EXPORT_REQUEST_FAILED,
    stage,
  }
}

export function trackMp4ExportClient(
  event: Mp4ExportEventName,
  payload: TrackEventPayload = {}
): void {
  trackEvent(event, payload)
}
