import { INSTRUCTION_PREFIXES } from '@/lib/input-understanding/intent-extraction'
import { sanitizeForGeneration } from '@/lib/input-understanding/clean-generation-context'

export const BANNED_INSTRUCTION_PHRASES: readonly string[] = [
  'help me',
  'create a',
  'create me',
  'generate a',
  'generate me',
  'write me',
  'make me',
  'make a',
  'can you',
  'i want',
  'i need',
  'please create',
  'please write',
  'please generate',
]

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function significantWords(text: string): string[] {
  return normalizeForCompare(text)
    .split(' ')
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'about'].includes(w))
}

function fuzzyContains(haystack: string, needle: string): boolean {
  const h = normalizeForCompare(haystack)
  const n = normalizeForCompare(needle)
  if (!h || !n) return false
  if (h.includes(n) || n.includes(h)) return true

  const needleWords = significantWords(needle)
  if (needleWords.length < 3) return h.includes(n)

  const matched = needleWords.filter((w) => h.includes(w)).length
  return matched / needleWords.length >= 0.6
}

export function containsBannedPhrases(text: string): boolean {
  const lower = text.toLowerCase()
  return BANNED_INSTRUCTION_PHRASES.some((phrase) => lower.includes(phrase))
}

export function containsInstructionLeak(text: string, rawInput: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || !rawInput.trim()) return false

  if (containsBannedPhrases(trimmed)) return true

  const sanitizedRaw = sanitizeForGeneration(rawInput)
  if (sanitizedRaw && fuzzyContains(trimmed, sanitizedRaw)) return true
  if (fuzzyContains(trimmed, rawInput)) return true

  for (const prefix of INSTRUCTION_PREFIXES) {
    if (trimmed.toLowerCase().includes(prefix)) return true
  }

  return false
}

export function repeatsSessionTitle(text: string, recentTitles: readonly string[]): boolean {
  const t = text.trim()
  if (!t || !recentTitles.length) return false
  return recentTitles.some(
    (prev) => prev.trim() && (fuzzyContains(t, prev) || fuzzyContains(prev, t))
  )
}

export function lacksCuriosity(text: string, kind: 'title' | 'hook'): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true

  const minLen = kind === 'title' ? 8 : 14
  if (trimmed.length < minLen) return true

  const genericPatterns = [
    /^untitled$/i,
    /^creator breakdown$/i,
    /^new video$/i,
    /^my video$/i,
    /^video about/i,
  ]
  if (genericPatterns.some((p) => p.test(trimmed))) return true

  if (kind === 'hook') {
    const hasHookSignal =
      /\?/.test(trimmed) ||
      /\b(you|your|most|nobody|before|stop|here'?s|secret|mistake|truth|pattern)\b/i.test(trimmed)
    return !hasHookSignal && trimmed.length < 40
  }

  return false
}

export function titlePassesValidation(
  title: string,
  rawInput: string,
  recentTitles: readonly string[] = []
): boolean {
  const t = title.trim()
  if (!t || t.length < 4) return false
  if (containsInstructionLeak(t, rawInput)) return false
  if (containsBannedPhrases(t)) return false
  if (repeatsSessionTitle(t, recentTitles)) return false
  if (lacksCuriosity(t, 'title') && t.length < 12) return false
  return true
}

export function hookPassesValidation(
  hook: string,
  rawInput: string,
  recentTitles: readonly string[] = []
): boolean {
  const h = hook.trim()
  if (!h || h.length < 10) return false
  if (containsInstructionLeak(h, rawInput)) return false
  if (containsBannedPhrases(h)) return false
  if (repeatsSessionTitle(h, recentTitles)) return false
  if (lacksCuriosity(h, 'hook')) return false
  return true
}
