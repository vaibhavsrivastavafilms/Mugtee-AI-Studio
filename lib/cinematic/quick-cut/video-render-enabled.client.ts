/**
 * Client mirror of server `isVideoRenderEnabled()`.
 * `/api/quick-cut/config` → `videoRenderEnabled` is the single source of truth.
 * Do not infer export availability from NEXT_PUBLIC_* env vars — they diverge from server gates.
 */

/** Resolve whether MP4 compile/render is available in the UI. */
export function isClientVideoRenderEnabled(configFlag?: boolean): boolean {
  return configFlag === true
}

/** Initial store value before `/api/quick-cut/config` resolves. */
export function defaultClientVideoRenderEnabled(): boolean {
  return false
}
