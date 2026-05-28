export type FeedbackContext = 'generation' | 'preview' | 'export' | 'return' | 'compile'
export type FeedbackRating = 'up' | 'down'

type FeedbackEntry = {
  context: FeedbackContext
  rating: FeedbackRating
  note?: string
  at: string
}

const STORAGE_KEY = 'mugtee:creator:feedback:v1'
const MAX_ENTRIES = 24

function readEntries(): FeedbackEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEntries(entries: FeedbackEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    /* ignore */
  }
}

export function hasFeedbackFor(context: FeedbackContext): boolean {
  return readEntries().some((e) => e.context === context)
}

export function saveCreatorFeedback(
  context: FeedbackContext,
  rating: FeedbackRating,
  note?: string
): void {
  const trimmed = note?.trim()
  const entry: FeedbackEntry = {
    context,
    rating,
    at: new Date().toISOString(),
    ...(trimmed ? { note: trimmed.slice(0, 280) } : {}),
  }
  const next = [entry, ...readEntries().filter((e) => e.context !== context)]
  writeEntries(next)
}

export function recentFeedbackResonance(context: FeedbackContext): FeedbackRating | null {
  const entry = readEntries().find((e) => e.context === context)
  return entry?.rating ?? null
}

export function shouldPromptFeedback(context: FeedbackContext): boolean {
  return !hasFeedbackFor(context)
}
