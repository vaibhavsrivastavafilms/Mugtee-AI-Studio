/** Hook deduplication and framework rotation for Quick Cut regeneration. */

import {
  HOOK_FRAMEWORKS,
  HOOK_FRAMEWORK_IDS,
  selectHookFramework,
  type HookFramework,
} from '@/lib/cinematic/content-angle-engine'

export const HOOK_SIMILARITY_THRESHOLD = 0.7

export const MAX_HOOK_SIMILARITY_RETRIES = 3

export type HookRegenFramework = HookFramework

export const HOOK_REGEN_FRAMEWORKS: readonly HookRegenFramework[] = HOOK_FRAMEWORK_IDS.map(
  (id) => HOOK_FRAMEWORKS[id]
)

export function rotatedHookFramework(attemptIndex: number): HookRegenFramework {
  return selectHookFramework({ attemptIndex })
}

export function normalizeHookText(hook: string): string {
  return hook
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeHookText(text)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
}

export function hookOverlapRatio(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1
  })
  return shared / Math.min(ta.size, tb.size)
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.size || !tb.size) return 0
  const union = new Set([...ta, ...tb])
  let intersection = 0
  ta.forEach((t) => {
    if (tb.has(t)) intersection += 1
  })
  return intersection / union.size
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1])
      prev = temp
    }
  }
  return row[b.length]
}

function normalizedLevenshteinSimilarity(a: string, b: string): number {
  const na = normalizeHookText(a)
  const nb = normalizeHookText(b)
  if (!na || !nb) return 0
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  if (!maxLen) return 0
  return 1 - dist / maxLen
}

/** Combined similarity — max of overlap, Jaccard, and normalized Levenshtein. */
export function hookSimilarityScore(a: string, b: string): number {
  return Math.max(
    hookOverlapRatio(a, b),
    jaccardSimilarity(a, b),
    normalizedLevenshteinSimilarity(a, b)
  )
}

export function isHookTooSimilar(
  candidate: string,
  previousHooks: string[],
  threshold = HOOK_SIMILARITY_THRESHOLD
): boolean {
  const normalized = normalizeHookText(candidate)
  if (!normalized) return true

  for (const prev of previousHooks) {
    if (!prev.trim()) continue
    if (normalizeHookText(prev) === normalized) return true
    if (hookSimilarityScore(candidate, prev) >= threshold) return true
  }
  return false
}

export function coercePreviousHooks(raw: unknown, max = 24): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-max)
}

export function hookPatternLabel(pattern: string): string {
  return pattern.replace(/-/g, ' ')
}
