import { createHash } from 'crypto'

/** Server-side hook/title bundle cache — rules path is deterministic per key. */
export const HOOK_GENERATION_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 128

type CacheEntry = { at: number; data: Record<string, unknown> }

const store = new Map<string, CacheEntry>()

export function isHookGenerationCacheEnabled(): boolean {
  if (process.env.HOOK_CACHE === '0' || process.env.HOOK_CACHE === 'false') return false
  if (process.env.HOOK_CACHE === '1' || process.env.HOOK_CACHE === 'true') return true
  return process.env.NODE_ENV === 'development'
}

export function hashHookGenerationKey(parts: {
  topic: string
  niche: string
  platform?: string
  sessionSeed: string | number
  attemptIndex: number
  contentAngleId?: string
  hookFrameworkId?: string
  previousHooksKey?: string
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        topic: parts.topic.trim().toLowerCase(),
        niche: parts.niche,
        platform: parts.platform ?? '',
        sessionSeed: String(parts.sessionSeed),
        attemptIndex: parts.attemptIndex,
        contentAngleId: parts.contentAngleId ?? '',
        hookFrameworkId: parts.hookFrameworkId ?? '',
        previousHooksKey: parts.previousHooksKey ?? '',
      })
    )
    .digest('hex')
}

export function getHookGenerationCache(
  key: string,
  ttlMs = HOOK_GENERATION_CACHE_TTL_MS
): Record<string, unknown> | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > ttlMs) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setHookGenerationCache(key: string, data: Record<string, unknown>): void {
  if (store.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null
    let oldestAt = Infinity
    for (const [k, v] of store) {
      if (v.at < oldestAt) {
        oldestAt = v.at
        oldestKey = k
      }
    }
    if (oldestKey) store.delete(oldestKey)
  }
  store.set(key, { at: Date.now(), data })
}
