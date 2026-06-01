/** Same-origin reel download routes — safe to skip remote HEAD validation. */

export function isSameOriginReelDownloadUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/api/reels/download/')) return true
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(trimmed, window.location.origin)
      return (
        parsed.origin === window.location.origin &&
        parsed.pathname.startsWith('/api/reels/download/')
      )
    } catch {
      return false
    }
  }
  return false
}

export function projectReelFileDownloadPath(projectId: string): string {
  return `/api/reels/download/${encodeURIComponent(projectId)}/file`
}
