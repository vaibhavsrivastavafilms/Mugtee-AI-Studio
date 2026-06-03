import type { MemoryProfile } from '@/lib/memory/types'

const sessionCache = new Map<string, { profile: MemoryProfile; context: string; at: number }>()
const TTL_MS = 10 * 60 * 1000

export function memoryCacheKey(userId: string, goal: string): string {
  return `${userId}:${goal.trim().toLowerCase().slice(0, 120)}`
}

export function getCachedMemorySession(key: string): { profile: MemoryProfile; context: string } | null {
  const hit = sessionCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > TTL_MS) {
    sessionCache.delete(key)
    return null
  }
  return { profile: hit.profile, context: hit.context }
}

export function setCachedMemorySession(
  key: string,
  profile: MemoryProfile,
  context: string
): void {
  sessionCache.set(key, { profile, context, at: Date.now() })
}
