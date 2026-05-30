// Mugtee Workspace — shared lightweight runtime validation + normalization.
//
// No schema library (zero deps). Just small focused helpers that every workspace
// route uses to defend against malformed input, malformed LLM JSON, malformed DB
// rows, and abusive payload sizes.

export const OUTPUT_FIELDS = ['hook', 'script', 'storyboard', 'captions', 'thumbnailIdea'] as const
export type OutputField = typeof OUTPUT_FIELDS[number]
export type WorkspaceOutput = Record<OutputField, string>

export const EMPTY_OUTPUT: WorkspaceOutput = {
  hook: '', script: '', storyboard: '', captions: '', thumbnailIdea: '',
}

// Caps — protect DB rows + LLM input cost. Generous, but bounded.
export const LIMITS = {
  topic: 1200,         // single textarea input
  title: 120,          // stored as content_pieces.title
  outputField: 12_000, // each of hook/script/storyboard/captions/thumbnailIdea
  outputTotal: 60_000, // sum of all 5 fields
} as const

// RFC 4122-ish UUID v1-v5. Supabase generates v4. We accept any version digit.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

const ALLOWED_PLATFORMS = new Set(['instagram_reel', 'youtube_short', 'youtube_video'])
const ALLOWED_TONES = new Set(['cinematic', 'emotional', 'funny', 'motivational'])

export function coerceTopic(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, LIMITS.topic)
}

export function coercePlatform(raw: unknown): 'instagram_reel' | 'youtube_short' | 'youtube_video' {
  if (typeof raw === 'string' && ALLOWED_PLATFORMS.has(raw)) return raw as any
  return 'instagram_reel'
}

export function coerceTone(raw: unknown): string {
  if (typeof raw === 'string' && ALLOWED_TONES.has(raw)) return raw
  return 'cinematic'
}

export const MAX_VIDEO_DURATION_SEC = 60
export const MIN_VIDEO_DURATION_SEC = 15

export function coerceDuration(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isFinite(n)) return MAX_VIDEO_DURATION_SEC
  return Math.min(
    Math.max(Math.round(n), MIN_VIDEO_DURATION_SEC),
    MAX_VIDEO_DURATION_SEC
  )
}

/**
 * Force `o` into a complete WorkspaceOutput. Every field becomes a trimmed string
 * (objects/arrays/null/undefined fall back to `fallback[k]`). Each field is capped
 * at LIMITS.outputField; the total payload at LIMITS.outputTotal.
 *
 * Use this on:
 *   • LLM JSON output before returning to the client
 *   • client-supplied output before persisting to Supabase
 *   • DB-parsed output before sending back to the client on rehydration
 */
export function normalizeOutput(o: any, fallback: WorkspaceOutput = EMPTY_OUTPUT): WorkspaceOutput {
  const safe = (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}
  const out: WorkspaceOutput = { ...EMPTY_OUTPUT }
  let totalSize = 0
  for (const k of OUTPUT_FIELDS) {
    const v = safe[k]
    let str = typeof v === 'string' ? v.trim() : ''
    if (!str) str = fallback[k] || ''
    if (str.length > LIMITS.outputField) str = str.slice(0, LIMITS.outputField)
    // If the rolling total would overflow, truncate this field to fit.
    if (totalSize + str.length > LIMITS.outputTotal) {
      str = str.slice(0, Math.max(0, LIMITS.outputTotal - totalSize))
    }
    out[k] = str
    totalSize += str.length
  }
  return out
}

/** Tiny structured logger — single JSON line, never throws, caps payload size. */
export function logError(scope: string, err: unknown, extra?: Record<string, unknown>) {
  try {
    const payload = {
      scope,
      msg: (err as any)?.message || String(err || '').slice(0, 300),
      code: (err as any)?.code,
      ...(extra || {}),
    }
    // eslint-disable-next-line no-console
    console.error('[mugtee]', JSON.stringify(payload).slice(0, 1500))
  } catch {
    // eslint-disable-next-line no-console
    console.error('[mugtee] log failed for scope', scope)
  }
}
