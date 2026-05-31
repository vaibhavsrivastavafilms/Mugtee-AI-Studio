/** Shared reel download URL checks (safe for client + server). */

export function isValidReelDownloadUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return true
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:') return true
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      return parsed.protocol === 'http:'
    }
    return false
  } catch {
    return false
  }
}

export type ReelFileVerification = {
  ok: boolean
  size?: number
  error?: string
}
