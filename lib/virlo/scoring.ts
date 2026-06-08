import type { VirloScores } from '@/lib/virlo/types'

export type ScoringInput = {
  viralitySignals?: number
  retentionScore: number
  hookConfidence: number
  frameworkConfidence: number
  emotionConfidence: number
  contentLength?: number
  hasPersonalStory?: boolean
  hasSpecificity?: boolean
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

/** Compute composite Virlo scores 0-100. */
export function computeVirloScores(input: ScoringInput): VirloScores {
  const baseVirality =
    input.viralitySignals ??
    (input.hookConfidence * 0.35 +
      input.retentionScore * 0.3 +
      input.frameworkConfidence * 0.2 +
      input.emotionConfidence * 0.15)

  const specificityBoost = input.hasSpecificity ? 8 : 0
  const storyBoost = input.hasPersonalStory ? 6 : 0
  const lengthPenalty =
    input.contentLength !== undefined && input.contentLength < 40 ? -12 : 0

  const viralityScore = clamp(baseVirality + specificityBoost + storyBoost + lengthPenalty)
  const retentionScore = clamp(input.retentionScore)
  const shareabilityScore = clamp(
    viralityScore * 0.45 + input.hookConfidence * 0.35 + (input.hasSpecificity ? 15 : 0)
  )
  const saveabilityScore = clamp(
    retentionScore * 0.4 + input.frameworkConfidence * 0.35 + (input.hasPersonalStory ? 12 : 0)
  )
  const storyQualityScore = clamp(
    input.frameworkConfidence * 0.4 +
      input.emotionConfidence * 0.3 +
      retentionScore * 0.3
  )

  return {
    viralityScore,
    retentionScore,
    shareabilityScore,
    saveabilityScore,
    storyQualityScore,
    frameworkConfidence: clamp(input.frameworkConfidence),
  }
}

/** Derive scores from a seeded viral_patterns row. */
export function scoresFromSeedPattern(row: {
  virality_score: number
  shareability_score: number
  saveability_score: number
  story_quality_score: number
  framework_confidence: number
  retention_strategy?: string | null
}): VirloScores {
  const retentionHint = row.retention_strategy?.toLowerCase() ?? ''
  const retentionScore = retentionHint.includes('open loop')
    ? 82
    : retentionHint.includes('pattern interrupt')
      ? 78
      : retentionHint.includes('reveal')
        ? 75
        : 68

  return {
    viralityScore: row.virality_score,
    retentionScore,
    shareabilityScore: row.shareability_score,
    saveabilityScore: row.saveability_score,
    storyQualityScore: row.story_quality_score,
    frameworkConfidence: row.framework_confidence,
  }
}
