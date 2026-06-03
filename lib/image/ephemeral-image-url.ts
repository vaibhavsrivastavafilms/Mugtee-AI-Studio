/** Ephemeral AI CDN URLs — bypass Next.js image optimizer (502) until persisted to storage. */
export function isEphemeralRemoteImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const u = url.trim().toLowerCase()
  return (
    u.startsWith('data:') ||
    u.startsWith('blob:') ||
    u.includes('image.pollinations.ai') ||
    u.includes('pollinations.ai/')
  )
}

export function shouldUnoptimizeImageSrc(url: string | null | undefined): boolean {
  return isEphemeralRemoteImageUrl(url)
}
