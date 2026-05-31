import {
  hookPassesValidation,
  titlePassesValidation,
} from '@/lib/input-understanding/output-validation'
import { isBannedHookOpening, isBannedTitle } from '@/lib/cinematic/content-angle-engine'
import type { HookCandidate } from '@/lib/virlo-engine/types'

const MAX_VALIDATION_RETRIES = 2

function scoreTitleCandidate(text: string): number {
  let score = 0
  const t = text.trim()
  if (!t) return -10
  if (t.length >= 12 && t.length <= 72) score += 2
  if (/\?/.test(t)) score += 1
  if (/—|:|\|/.test(t)) score += 0.5
  if (/\b(the|a|an)\s+\w+/i.test(t)) score += 1
  if (isBannedTitle(t)) score -= 6
  if (containsInstructionWords(t)) score -= 8
  return score
}

function scoreHookCandidate(text: string): number {
  let score = 0
  const h = text.trim()
  if (!h) return -10
  if (h.length >= 20 && h.length <= 180) score += 2
  if (/\?/.test(h)) score += 2
  if (/\b(you|your)\b/i.test(h)) score += 2
  if (/\b(most|nobody|before|stop|secret|pattern|mistake)\b/i.test(h)) score += 1.5
  if (isBannedHookOpening(h)) score -= 6
  if (containsInstructionWords(h)) score -= 8
  return score
}

function containsInstructionWords(text: string): boolean {
  return /\b(help me|create a|generate|write me|make a|can you|i want|i need)\b/i.test(text)
}

export function selectBestTitleCandidate(
  candidates: readonly string[],
  rawInput: string,
  recentTitles: readonly string[] = []
): string | null {
  const ranked = [...candidates]
    .map((text) => ({
      text: text.trim(),
      score: scoreTitleCandidate(text),
    }))
    .filter(
      (c) =>
        c.text &&
        titlePassesValidation(c.text, rawInput, recentTitles) &&
        !isBannedTitle(c.text)
    )
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.text ?? null
}

export function selectBestHookCandidate(
  candidates: readonly HookCandidate[] | readonly string[],
  rawInput: string,
  recentTitles: readonly string[] = []
): string | null {
  const normalized = candidates.map((c) =>
    typeof c === 'string' ? { text: c, score: scoreHookCandidate(c) } : { text: c.text, score: c.tensionScore + scoreHookCandidate(c.text) }
  )

  const ranked = normalized
    .filter(
      (c) =>
        c.text.trim() &&
        hookPassesValidation(c.text, rawInput, recentTitles) &&
        !isBannedHookOpening(c.text)
    )
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.text ?? null
}

export type ValidatedSelectionResult<T> = {
  value: T
  retries: number
}

/** Pick validated title with up to MAX_VALIDATION_RETRIES alternate seeds. */
export function pickValidatedTitle(
  generate: (attemptIndex: number) => string[],
  rawInput: string,
  recentTitles: readonly string[] = []
): ValidatedSelectionResult<string> {
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const candidates = generate(attempt)
    const selected = selectBestTitleCandidate(candidates, rawInput, recentTitles)
    if (selected) return { value: selected, retries: attempt }
  }

  const fallbackPool = generate(MAX_VALIDATION_RETRIES + 1)
  const fallback =
    fallbackPool.find((t) => !containsInstructionWords(t)) ??
    fallbackPool[0] ??
    'Untitled'
  return { value: fallback.replace(/\bhelp me\b/gi, '').trim() || 'Untitled', retries: MAX_VALIDATION_RETRIES }
}

/** Pick validated hook with up to MAX_VALIDATION_RETRIES alternate seeds. */
export function pickValidatedHook(
  generate: (attemptIndex: number) => HookCandidate[],
  rawInput: string,
  recentTitles: readonly string[] = []
): ValidatedSelectionResult<{ text: string; variant?: string }> {
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const candidates = generate(attempt)
    const selected = selectBestHookCandidate(candidates, rawInput, recentTitles)
    if (selected) {
      const match = candidates.find((c) => c.text === selected)
      return {
        value: { text: selected, variant: match?.variant },
        retries: attempt,
      }
    }
  }

  const last = generate(MAX_VALIDATION_RETRIES + 1)
  const text =
    last[0]?.text.replace(/\bhelp me\b/gi, '').trim() ||
    'Most creators quit here — this pattern changes everything.'
  return { value: { text, variant: last[0]?.variant }, retries: MAX_VALIDATION_RETRIES }
}

export { MAX_VALIDATION_RETRIES }
