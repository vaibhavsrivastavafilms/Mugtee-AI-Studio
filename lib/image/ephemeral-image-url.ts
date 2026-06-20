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

/** Next.js `/_next/image?url=` rejects very long encoded sources. */
const NEXT_IMAGE_PROXY_BUDGET = 7500

export function shouldUnoptimizeImageSrc(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const trimmed = url.trim()
  if (isEphemeralRemoteImageUrl(trimmed)) return true
  // Approximate final proxy URL length (worst-case width/quality params).
  return `/_next/image?url=${encodeURIComponent(trimmed)}&w=3840&q=75`.length > NEXT_IMAGE_PROXY_BUDGET
}
