const TTL_MS = 5 * 60 * 1000
const PREFIX = 'mugtee-llm-pipeline:'

const CACHEABLE_POST_PATHS = new Set([
  '/api/generate-script',
  '/api/generate-scenes',
  '/api/ai/deep-research',
  '/api/generate-title',
])

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined'
}

export function isPipelineLlmCacheEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LLM_CACHE === '0') return false
  return process.env.NODE_ENV === 'development'
}

export function pipelineLlmCacheKey(url: string, body: string): string {
  const path = url.startsWith('http')
    ? new URL(url).pathname
    : url.split('?')[0] ?? url
  return `${PREFIX}${path}:${body}`
}

export function getPipelineLlmCache<T>(key: string): T | null {
  if (!isPipelineLlmCacheEnabled() || !storageAvailable()) return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; data: T }
    if (Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function setPipelineLlmCache<T>(key: string, data: T): void {
  if (!isPipelineLlmCacheEnabled() || !storageAvailable()) return
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* quota */
  }
}

export function shouldUsePipelineLlmCache(url: string, method?: string): boolean {
  if (!isPipelineLlmCacheEnabled()) return false
  if ((method ?? 'GET').toUpperCase() !== 'POST') return false
  const path = url.startsWith('http')
    ? new URL(url).pathname
    : url.split('?')[0] ?? url
  return CACHEABLE_POST_PATHS.has(path)
}
