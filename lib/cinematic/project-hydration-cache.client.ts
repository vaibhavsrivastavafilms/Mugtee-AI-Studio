import type { CinematicProjectRow } from '@/lib/cinematic-projects'

const CACHE_PREFIX = 'mugtee:project-hydration:'
const TTL_MS = 5 * 60 * 1000

type CacheEntry = { at: number; row: CinematicProjectRow }

function cacheKey(projectId: string): string {
  return `${CACHE_PREFIX}${projectId}`
}

export function readProjectHydrationCache(projectId: string): CinematicProjectRow | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (!parsed?.at || !parsed.row) return null
    if (Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(cacheKey(projectId))
      return null
    }
    return parsed.row
  } catch {
    return null
  }
}

export function writeProjectHydrationCache(
  projectId: string,
  row: CinematicProjectRow
): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CacheEntry = { at: Date.now(), row }
    sessionStorage.setItem(cacheKey(projectId), JSON.stringify(entry))
  } catch {
    /* quota or private mode */
  }
}

export function invalidateProjectHydrationCache(projectId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(cacheKey(projectId))
  } catch {
    /* ignore */
  }
}
