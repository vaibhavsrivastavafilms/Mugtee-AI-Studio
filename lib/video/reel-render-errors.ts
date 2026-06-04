/** Creator-facing message when MP4 export fails — project data is preserved. */
export const CINEMATIC_EXPORT_FAILURE_MSG =
  "We couldn't complete the cinematic export. Your project is safe. Please retry."

/** Shown when server-side MP4 export is unavailable but in-browser preview works. */
export const REEL_EXPORT_UNAVAILABLE_MSG =
  'Reel export is temporarily unavailable — your preview still works.'

/** Dev-only — operators enable VIDEO_RENDER_ENABLED in .env.local */
export const REEL_EXPORT_DISABLED_DEV_MSG =
  'MP4 export is disabled on this server. Add VIDEO_RENDER_ENABLED=true (or VIDEO_RENDER_MOCK=true for local dev) to .env.local and restart the dev server.'

/** Production-facing — no env jargon for creators */
export const REEL_EXPORT_DISABLED_USER_MSG =
  'MP4 export is temporarily unavailable on this server. Preview your reel and download script, storyboard images, and narration below.'

/** @deprecated Use REEL_EXPORT_DISABLED_USER_MSG for UI; dev copy in REEL_EXPORT_DISABLED_DEV_MSG */
export const REEL_EXPORT_DISABLED_MSG = REEL_EXPORT_DISABLED_USER_MSG

function isRenderDisabledMessage(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    msg.includes('VIDEO_RENDER') ||
    lower.includes('not enabled') ||
    lower.includes('not available on this server')
  )
}

function isTransientRenderFailure(msg: string): boolean {
  if (msg.startsWith('Cannot export reel —')) return false
  return (
    msg.includes('Remotion') ||
    msg.includes('FFmpeg') ||
    msg.includes('Chromium') ||
    msg.includes('timed out')
  )
}

export function isReelExportNoticeMessage(msg: string | null | undefined): boolean {
  if (!msg?.trim()) return false
  const trimmed = msg.trim()
  return (
    trimmed === REEL_EXPORT_UNAVAILABLE_MSG ||
    trimmed === REEL_EXPORT_DISABLED_USER_MSG ||
    trimmed === REEL_EXPORT_DISABLED_DEV_MSG ||
    trimmed.includes('VIDEO_RENDER') ||
    trimmed.includes('MP4 export') ||
    trimmed.includes('Reel export') ||
    trimmed.includes('Video render unavailable')
  )
}

const GENERIC_EXPORT_FAILURES = new Set([
  'Reel export failed',
  'Reel render failed — preview is still available.',
  'Export failed. Try again in a moment.',
  'Video render unavailable',
  'Export poll unavailable — refresh the page and try Compile MP4 again.',
])

function isUserFacingExportValidation(msg: string): boolean {
  return (
    msg.startsWith('Cannot export reel —') ||
    msg.startsWith('Add voiceover') ||
    msg.includes('required before exporting') ||
    msg.includes('storyboard scene is required') ||
    msg.includes('Export assets are missing') ||
    msg.includes('Export job expired') ||
    msg.includes('Add storyboard images and voice')
  )
}

/** User-facing copy when server-side reel render fails. */
export function friendlyReelRenderError(raw: string | null | undefined): string {
  if (!raw?.trim()) return REEL_EXPORT_UNAVAILABLE_MSG
  const msg = raw.trim()
  if (isUserFacingExportValidation(msg)) return msg.slice(0, 160)
  if (isRenderDisabledMessage(msg)) return REEL_EXPORT_DISABLED_USER_MSG
  if (isTransientRenderFailure(msg)) return CINEMATIC_EXPORT_FAILURE_MSG
  if (GENERIC_EXPORT_FAILURES.has(msg)) return CINEMATIC_EXPORT_FAILURE_MSG
  if (msg.toLowerCase().includes('is not a function')) return CINEMATIC_EXPORT_FAILURE_MSG
  return msg.slice(0, 160)
}

/** Server-side async export jobs — same copy as client polling. */
export function friendlyReelRenderErrorFromUnknown(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Reel export failed'
  return friendlyReelRenderError(raw)
}
