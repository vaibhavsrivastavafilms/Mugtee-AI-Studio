/** Shown when server-side MP4 export is unavailable but in-browser preview works. */
export const REEL_EXPORT_UNAVAILABLE_MSG =
  'Reel export is temporarily unavailable — your preview still works.'

export const REEL_EXPORT_DISABLED_MSG =
  'MP4 export is disabled on this server. Add VIDEO_RENDER_ENABLED=true (or VIDEO_RENDER_MOCK=true for local dev) to .env.local and restart the dev server.'

function isRenderDisabledMessage(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    msg.includes('VIDEO_RENDER') ||
    lower.includes('not enabled') ||
    lower.includes('not available on this server')
  )
}

function isTransientRenderFailure(msg: string): boolean {
  return (
    msg.includes('Remotion') ||
    msg.includes('FFmpeg') ||
    msg.includes('Chromium') ||
    msg.includes('timed out')
  )
}

/** User-facing copy when server-side reel render fails. */
export function friendlyReelRenderError(raw: string | null | undefined): string {
  if (!raw?.trim()) return REEL_EXPORT_UNAVAILABLE_MSG
  const msg = raw.trim()
  if (isRenderDisabledMessage(msg)) return REEL_EXPORT_DISABLED_MSG
  if (isTransientRenderFailure(msg)) return REEL_EXPORT_UNAVAILABLE_MSG
  return msg.slice(0, 160)
}

/** Server-side async export jobs — same copy as client polling. */
export function friendlyReelRenderErrorFromUnknown(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Reel export failed'
  return friendlyReelRenderError(raw)
}
