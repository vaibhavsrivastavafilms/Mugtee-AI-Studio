/** User-facing copy when server-side reel render fails. */
export function friendlyReelRenderError(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Reel export is temporarily unavailable — your preview still works.'
  const msg = raw.trim()
  if (
    msg.includes('VIDEO_RENDER') ||
    msg.includes('Remotion') ||
    msg.includes('FFmpeg') ||
    msg.includes('Chromium') ||
    msg.includes('timed out')
  ) {
    return 'Reel export is temporarily unavailable — your preview still works.'
  }
  return msg.slice(0, 160)
}
