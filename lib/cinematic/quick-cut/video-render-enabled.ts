/** Quick Cut MVP — real MP4 compile is Phase 2 unless explicitly enabled. */
export function isVideoRenderEnabled(): boolean {
  return process.env.VIDEO_RENDER_ENABLED === 'true'
}
