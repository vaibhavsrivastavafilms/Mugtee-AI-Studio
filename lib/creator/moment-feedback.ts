export const FeedbackTypes = [
  'output_rating',
  'export_satisfaction',
  'suggestion',
] as const
export type FeedbackType = (typeof FeedbackTypes)[number]

export const OutputRatings = ['helpful', 'needs_improvement'] as const
export type OutputRating = (typeof OutputRatings)[number]

export const ImprovementReasons = [
  'hook_weak',
  'script_generic',
  'storyboard_unclear',
  'caption_weak',
  'not_my_niche',
  'other',
] as const
export type ImprovementReason = (typeof ImprovementReasons)[number]

export const ExportReadinessValues = ['used_as_is', 'minor_edits', 'major_edits'] as const
export type ExportReadiness = (typeof ExportReadinessValues)[number]

export const IMPROVEMENT_REASON_LABELS: Record<ImprovementReason, string> = {
  hook_weak: 'Hook weak',
  script_generic: 'Script too generic',
  storyboard_unclear: 'Storyboard unclear',
  caption_weak: 'Caption weak',
  not_my_niche: 'Not my niche',
  other: 'Other',
}

export const EXPORT_READINESS_LABELS: Record<ExportReadiness, string> = {
  used_as_is: 'Used as-is',
  minor_edits: 'Minor edits',
  major_edits: 'Major edits required',
}

/** Severity for admin prioritization (higher = more urgent). */
export const IMPROVEMENT_REASON_SEVERITY: Record<ImprovementReason, number> = {
  hook_weak: 3,
  storyboard_unclear: 3,
  script_generic: 2,
  caption_weak: 2,
  not_my_niche: 1,
  other: 1,
}

export const FEEDBACK_STORAGE_PREFIX = 'mugtee:creator-feedback:'

export function feedbackStorageKey(
  kind: 'output-rating' | 'export' | 'suggestion',
  scopeId: string | null | undefined
): string {
  const scope = String(scopeId || '').trim() || 'session'
  return `${FEEDBACK_STORAGE_PREFIX}${kind}:${scope}`
}

export function hasFeedbackPromptDone(
  kind: 'output-rating' | 'export' | 'suggestion',
  scopeId: string | null | undefined
): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(feedbackStorageKey(kind, scopeId)) === '1'
  } catch {
    return false
  }
}

export function markFeedbackPromptDone(
  kind: 'output-rating' | 'export' | 'suggestion',
  scopeId: string | null | undefined
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(feedbackStorageKey(kind, scopeId), '1')
  } catch {
    /* ignore */
  }
}

export type SubmitMomentFeedbackBody = {
  feedback_type: FeedbackType
  project_id?: string | null
  rating?: OutputRating | null
  improvement_reason?: ImprovementReason | null
  export_readiness?: ExportReadiness | null
  suggestion_text?: string | null
}

export async function submitMomentFeedback(
  body: SubmitMomentFeedbackBody
): Promise<{ ok: boolean }> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(String((err as { error?: string }).error || res.statusText))
  }
  return res.json() as Promise<{ ok: boolean }>
}
