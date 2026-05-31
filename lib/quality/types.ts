export type ContentQualityBreakdown = {
  hook: number
  storytelling: number
  emotion: number
  retention: number
  cta: number
}

export type ContentQualityScore = {
  overall: number
  breakdown: ContentQualityBreakdown
  suggestions: string[]
  reviewedAt: number
}

export type ContentQualityReviewInput = {
  hook?: string
  script?: string
  cta?: string
  platform?: string
  tone?: string
  duration?: number
}

export function normalizeContentQualityScore(raw: unknown): ContentQualityScore | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const breakdown = o.breakdown
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return null
  const b = breakdown as Record<string, unknown>

  const clamp10 = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(10, Math.round(n)))
  }

  const overall =
    typeof o.overall === 'number' && Number.isFinite(o.overall)
      ? Math.max(0, Math.min(100, Math.round(o.overall)))
      : null
  if (overall === null) return null

  const suggestions = Array.isArray(o.suggestions)
    ? o.suggestions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 3)
    : []

  const reviewedAt =
    typeof o.reviewedAt === 'number' && Number.isFinite(o.reviewedAt)
      ? o.reviewedAt
      : Date.now()

  return {
    overall,
    breakdown: {
      hook: clamp10(b.hook),
      storytelling: clamp10(b.storytelling),
      emotion: clamp10(b.emotion),
      retention: clamp10(b.retention),
      cta: clamp10(b.cta),
    },
    suggestions,
    reviewedAt,
  }
}
