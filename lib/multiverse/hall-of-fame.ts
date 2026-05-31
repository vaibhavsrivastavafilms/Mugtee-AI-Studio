import type { AchievementId } from '@/lib/mission/achievements'
import type { HallOfFameCache } from '@/lib/multiverse/types'
import type { MissionStats, MissionStreak } from '@/lib/mission/mission-types'

const ACHIEVEMENT_LABELS: Partial<Record<AchievementId, string>> = {
  first_script: 'First Script',
  first_hook: 'First Hook',
  first_export: 'First Export',
  streak_3: '3-Day Streak',
  streak_7: '7-Day Streak',
  streak_30: '30-Day Streak',
  story_score_80: 'Story Score 80+',
  story_score_90: 'Story Score 90+',
  ten_scripts: '10 Scripts',
  five_exports: '5 Exports',
}

export type HallOfFameInput = {
  stats: MissionStats
  streak: MissionStreak
  achievements: AchievementId[]
}

export function buildHallOfFame(input: HallOfFameInput): HallOfFameCache {
  const { stats, streak, achievements } = input

  const topAchievement = achievements
    .slice()
    .reverse()
    .map((a) => ACHIEVEMENT_LABELS[a] ?? a)
    .find(Boolean)

  return {
    bestStoryScore: stats.bestStoryScore > 0 ? stats.bestStoryScore : undefined,
    bestScriptTitle: stats.scriptsCompleted > 0 ? `${stats.scriptsCompleted} scripts crafted` : undefined,
    longestStreak: streak.count > 0 ? streak.count : undefined,
    totalExports: stats.videosCompleted > 0 ? stats.videosCompleted : undefined,
    topAchievement,
    updatedAt: new Date().toISOString(),
  }
}

export function hallOfFameHighlights(cache: HallOfFameCache): string[] {
  const lines: string[] = []
  if (cache.bestStoryScore) lines.push(`Best story score: ${cache.bestStoryScore}`)
  if (cache.longestStreak) lines.push(`Longest streak: ${cache.longestStreak} days`)
  if (cache.totalExports) lines.push(`Total exports: ${cache.totalExports}`)
  if (cache.topAchievement) lines.push(`Latest achievement: ${cache.topAchievement}`)
  return lines
}
