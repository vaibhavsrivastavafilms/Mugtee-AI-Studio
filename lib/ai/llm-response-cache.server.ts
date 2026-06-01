import { createHash } from 'crypto'

/** Dev / explicit opt-in TTL for identical prompt+model OpenAI chat completions. */
export const LLM_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000

const MAX_ENTRIES = 256

type CacheEntry = { at: number; content: string }

const store = new Map<string, CacheEntry>()

export function isLlmResponseCacheEnabled(): boolean {
  if (process.env.LLM_CACHE === '0' || process.env.LLM_CACHE === 'false') return false
  if (process.env.LLM_CACHE === '1' || process.env.LLM_CACHE === 'true') return true
  return process.env.NODE_ENV === 'development'
}

export function hashLlmCacheKey(parts: {
  model: string
  system?: string
  user: string
  temperature?: number
  responseFormat?: string
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        model: parts.model,
        system: parts.system ?? '',
        user: parts.user,
        temperature: parts.temperature ?? null,
        responseFormat: parts.responseFormat ?? null,
      })
    )
    .digest('hex')
}

export function getLlmResponseCache(
  key: string,
  ttlMs = LLM_RESPONSE_CACHE_TTL_MS
): string | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > ttlMs) {
    store.delete(key)
    return null
  }
  return entry.content
}

export function setLlmResponseCache(key: string, content: string): void {
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
  store.set(key, { at: Date.now(), content })
}

export function clearLlmResponseCache(): void {
  store.clear()
}
