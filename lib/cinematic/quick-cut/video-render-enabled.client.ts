/**
 * Client mirror of server `isVideoRenderEnabled()` — dev mock render is on by default
 * during `npm run dev` unless explicitly disabled via env.
 */

function devMockRenderDefault(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_VIDEO_RENDER_ENABLED !== 'false' &&
    process.env.NEXT_PUBLIC_VIDEO_RENDER_MOCK !== 'false'
  )
}

/** Resolve whether MP4 compile/render is available in the UI. */
export function isClientVideoRenderEnabled(configFlag?: boolean): boolean {
  if (configFlag === true) return true
  if (
    process.env.NEXT_PUBLIC_VIDEO_RENDER_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_VIDEO_RENDER_MOCK === 'true'
  ) {
    return true
  }
  if (
    process.env.NEXT_PUBLIC_VIDEO_RENDER_ENABLED === 'false' ||
    process.env.NEXT_PUBLIC_VIDEO_RENDER_MOCK === 'false'
  ) {
    return false
  }
  return devMockRenderDefault()
}

/** Initial store value before `/api/quick-cut/config` resolves. */
export function defaultClientVideoRenderEnabled(): boolean {
  return isClientVideoRenderEnabled()
}
