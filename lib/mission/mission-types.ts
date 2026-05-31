import type { AchievementId } from '@/lib/mission/achievements'
import type { DailyQuestProgress } from '@/lib/mission/daily-quests'

export type MissionStreak = {
  count: number
  lastDate: string | null
}

export type MissionStats = {
  scriptsCompleted: number
  hooksCompleted: number
  videosCompleted: number
  bestStoryScore: number
}

export type MissionProfile = {
  creator_xp: number
  creator_level: number
  mission_streak: MissionStreak
  achievements: AchievementId[]
  daily_quests: DailyQuestProgress & { date?: string }
  last_active_date: string | null
  stats: MissionStats
}

export const DEFAULT_MISSION_STATS: MissionStats = {
  scriptsCompleted: 0,
  hooksCompleted: 0,
  videosCompleted: 0,
  bestStoryScore: 0,
}

export const DEFAULT_MISSION_PROFILE: MissionProfile = {
  creator_xp: 0,
  creator_level: 1,
  mission_streak: { count: 0, lastDate: null },
  achievements: [],
  daily_quests: {
    first_script: { count: 0, completed: false },
    three_projects: { count: 0, completed: false },
    first_reel: { count: 0, completed: false },
    date: undefined,
  },
  last_active_date: null,
  stats: { ...DEFAULT_MISSION_STATS },
}
