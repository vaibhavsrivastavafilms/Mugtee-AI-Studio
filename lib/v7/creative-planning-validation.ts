import { z } from 'zod'

/** User-submitted idea prompt — protect the API boundary. */
export const USER_IDEA_MAX_CHARS = 2000

/** Short labels: title, name, language, platform-adjacent fields. */
export const AI_PLANNING_TITLE_MAX = 256
export const AI_PLANNING_LABEL_MAX = 256
export const AI_PLANNING_IDENTIFIER_MAX = 128

/** Creative direction fields: music, voice, style, lighting, camera, mood. */
export const AI_PLANNING_DIRECTION_MAX = 8192

/** Long-form narrative: narration, dialogue, action, appearance. */
export const AI_PLANNING_NARRATIVE_MAX = 16384

/** Individual items in string arrays (research notes, mood board, etc.). */
export const AI_PLANNING_LIST_ITEM_MAX = 4096

export function normalizeCreativeText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return String(value).trim() || undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

export function normalizeOptionalCreativeText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return normalizeCreativeText(value)
}

export function aiPlanningText(maxLen: number = AI_PLANNING_DIRECTION_MAX) {
  return z.preprocess(
    (value) => normalizeCreativeText(value) ?? '',
    z.string().min(1).max(maxLen)
  )
}

export function aiPlanningTextOptional(maxLen: number = AI_PLANNING_DIRECTION_MAX) {
  return z.preprocess(
    (value) => normalizeOptionalCreativeText(value),
    z.string().min(1).max(maxLen).optional()
  )
}

export function aiPlanningTextArray(
  maxLen: number = AI_PLANNING_LIST_ITEM_MAX,
  maxItems = 32
) {
  return z.preprocess(
    (value) => {
      if (!Array.isArray(value)) return []
      return value
        .map((item) => normalizeCreativeText(item))
        .filter((item): item is string => Boolean(item))
        .slice(0, maxItems)
    },
    z.array(z.string().min(1).max(maxLen))
  )
}

export function aiPlanningTextArrayRequired(
  minItems: number,
  maxLen: number = AI_PLANNING_LIST_ITEM_MAX,
  maxItems = 32
) {
  return aiPlanningTextArray(maxLen, maxItems).pipe(
    z.array(z.string().min(1).max(maxLen)).min(minItems)
  )
}

/** Normalize raw LLM string fields without truncating creative detail. */
export function coercePlanningString(
  value: unknown,
  fallback: string,
  maxLen: number = AI_PLANNING_DIRECTION_MAX
): string {
  const normalized = normalizeCreativeText(value) ?? fallback
  return normalized.length <= maxLen ? normalized : normalized.slice(0, maxLen)
}

export function coerceOptionalPlanningString(
  value: unknown,
  maxLen: number = AI_PLANNING_DIRECTION_MAX
): string | undefined {
  const normalized = normalizeOptionalCreativeText(value)
  if (!normalized) return undefined
  return normalized.length <= maxLen ? normalized : normalized.slice(0, maxLen)
}
