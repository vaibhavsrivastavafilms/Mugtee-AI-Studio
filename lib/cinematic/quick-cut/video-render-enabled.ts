/** Quick Cut — MP4 compile when VIDEO_RENDER_ENABLED or dev mock render is on. */
export function isVideoRenderEnabled(): boolean {
  return (
    process.env.VIDEO_RENDER_ENABLED === 'true' ||
    process.env.VIDEO_RENDER_MOCK === 'true'
  )
}

/** Alias used by export/readiness checks — same gate as isVideoRenderEnabled. */
export function isReelExportAvailable(): boolean {
  return isVideoRenderEnabled()
}
