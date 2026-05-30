import { FEEDBACK_RATING_SCORE, type FeedbackRating } from '@/lib/analytics/events'

export type TrustScoreInputs = {
  generationStarted: number
  generationCompleted: number
  generationFailed: number
  resumeStarted: number
  resumeCompleted: number
  exportStarted: number
  exportCompleted: number
  feedbackRatings: FeedbackRating[]
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.min(1, numerator / denominator)
}

/** Weighted 0–100 trust score from funnel completion signals. */
export function computeTrustScore(inputs: TrustScoreInputs): number {
  const genComplete = rate(inputs.generationCompleted, inputs.generationStarted)
  const resumeSuccess = rate(inputs.resumeCompleted, inputs.resumeStarted)
  const exportComplete = rate(inputs.exportCompleted, Math.max(inputs.exportStarted, inputs.generationCompleted))

  let feedbackPart = 0.5
  if (inputs.feedbackRatings.length > 0) {
    const avg =
      inputs.feedbackRatings.reduce((s, r) => s + (FEEDBACK_RATING_SCORE[r] ?? 50), 0) /
      inputs.feedbackRatings.length
    feedbackPart = avg / 100
  }

  const raw =
    genComplete * 30 + resumeSuccess * 20 + exportComplete * 25 + feedbackPart * 25

  const penalty = inputs.generationFailed > 0 ? Math.min(10, inputs.generationFailed * 2) : 0
  return Math.round(Math.max(0, Math.min(100, raw - penalty)))
}

export function buildTrustAggregates(inputs: TrustScoreInputs, trustScore: number) {
  return {
    trust_score: trustScore,
    generation_started: inputs.generationStarted,
    generation_completed: inputs.generationCompleted,
    generation_failed: inputs.generationFailed,
    resume_started: inputs.resumeStarted,
    resume_completed: inputs.resumeCompleted,
    export_started: inputs.exportStarted,
    export_completed: inputs.exportCompleted,
    feedback_count: inputs.feedbackRatings.length,
  }
}
