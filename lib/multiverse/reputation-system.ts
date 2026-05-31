import type { CreatorReputation, ReputationRank } from '@/lib/multiverse/types'
import type { MissionStats, MissionStreak } from '@/lib/mission/mission-types'

export type ReputationInput = {
  stats: MissionStats
  streak: MissionStreak
  relationshipScore?: number
  learningEventCount?: number
}

const RANK_THRESHOLDS: { rank: ReputationRank; minTotal: number }[] = [
  { rank: 'legend', minTotal: 400 },
  { rank: 'elite', minTotal: 300 },
  { rank: 'notable', minTotal: 200 },
  { rank: 'established', minTotal: 120 },
  { rank: 'rising', minTotal: 50 },
  { rank: 'beginner', minTotal: 0 },
]

export function rankFromTotalScore(total: number): ReputationRank {
  for (const t of RANK_THRESHOLDS) {
    if (total >= t.minTotal) return t.rank
  }
  return 'beginner'
}

export const REPUTATION_RANK_LABELS: Record<ReputationRank, string> = {
  beginner: 'Beginner Creator',
  rising: 'Rising Creator',
  established: 'Established Creator',
  notable: 'Notable Creator',
  elite: 'Elite Creator',
  legend: 'Legend',
}

/** Compute reputation scores from mission + memory signals. */
export function computeReputation(input: ReputationInput): CreatorReputation {
  const { stats, streak, relationshipScore = 0, learningEventCount = 0 } = input

  const consistency = Math.min(100, streak.count * 8 + (stats.videosCompleted > 0 ? 10 : 0))
  const quality = Math.min(100, Math.round(stats.bestStoryScore * 0.85 + stats.scriptsCompleted * 2))
  const publishing = Math.min(100, stats.videosCompleted * 12 + (stats.videosCompleted >= 5 ? 15 : 0))
  const engagement = Math.min(100, Math.round(relationshipScore / 5 + stats.hooksCompleted * 3))
  const learning = Math.min(100, learningEventCount * 4 + stats.scriptsCompleted * 2)

  const total = Math.round(
    consistency * 0.2 + quality * 0.25 + publishing * 0.2 + engagement * 0.15 + learning * 0.2
  )

  return {
    consistency,
    quality,
    publishing,
    engagement,
    learning,
    rank: rankFromTotalScore(total),
  }
}

export function reputationRankLabel(rank: ReputationRank): string {
  return REPUTATION_RANK_LABELS[rank]
}
