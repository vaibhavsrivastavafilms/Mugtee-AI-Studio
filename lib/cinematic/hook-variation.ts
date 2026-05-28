/** Hook deduplication and framework rotation for Quick Cut regeneration. */

export const HOOK_SIMILARITY_THRESHOLD = 0.7

export const MAX_HOOK_SIMILARITY_RETRIES = 3

export type HookRegenFramework = {
  id: string
  name: string
  example: string
  instruction: string
}

export const HOOK_REGEN_FRAMEWORKS: readonly HookRegenFramework[] = [
  {
    id: 'contrarian',
    name: 'Contrarian',
    example:
      'Everyone says discipline is the answer — but the real story starts when you realize it was never about willpower.',
    instruction:
      'Open by naming a common belief, then invert it with a sharper, cinematic truth.',
  },
  {
    id: 'curiosity-gap',
    name: 'Curiosity Gap',
    example:
      'There is one detail in this story that changes everything — and most people scroll past it in the first second.',
    instruction:
      'Withhold the key reveal; create an itch to know more without resolving it in the hook.',
  },
  {
    id: 'psychological-observation',
    name: 'Psychological Observation',
    example:
      'The mind does something strange the moment success stops feeling like a surprise.',
    instruction:
      'Start with a precise psychological pattern the viewer recognizes in themselves.',
  },
  {
    id: 'direct-accusation',
    name: 'Direct Accusation',
    example:
      'You are not afraid of failing — you are afraid of what succeeding would demand from you.',
    instruction:
      'Use second-person direct address; name the fear or contradiction the viewer avoids.',
  },
  {
    id: 'documentary-opening',
    name: 'Documentary Opening',
    example:
      'In 2019, a photographer noticed something in the background of a single frame — and could not unsee it.',
    instruction:
      'Open like vérité documentary: specific time, place, or witness detail that pulls the viewer in.',
  },
  {
    id: 'hidden-truth',
    name: 'Hidden Truth',
    example:
      'Nobody posts the part where the victory feels hollow — but that is where this story actually begins.',
    instruction:
      'Expose what is deliberately hidden, unspoken, or edited out of the public version.',
  },
  {
    id: 'narrative-setup',
    name: 'Narrative Setup',
    example:
      'She had three seconds to decide — and every choice she made after that was already written.',
    instruction:
      'Drop the viewer mid-scene with a character, clock, or decision that implies a story unfolding.',
  },
  {
    id: 'emotional-contrast',
    name: 'Emotional Contrast',
    example:
      'The room was full of applause — and completely silent inside her head.',
    instruction:
      'Juxtapose outer appearance vs inner reality; cinematic contrast in one breath.',
  },
] as const

export function rotatedHookFramework(attemptIndex: number): HookRegenFramework {
  const idx = Math.abs(attemptIndex) % HOOK_REGEN_FRAMEWORKS.length
  return HOOK_REGEN_FRAMEWORKS[idx]
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
