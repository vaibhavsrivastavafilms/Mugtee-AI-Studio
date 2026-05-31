import { levelFromXp } from '@/lib/mission/creator-levels'
import {
  checkNewAchievements,
  type AchievementId,
  type AchievementProgress,
} from '@/lib/mission/achievements'
import {
  DAILY_QUESTS,
  defaultDailyQuestProgress,
  shouldResetDailyQuests,
  todayDateString,
  type DailyQuestId,
  type DailyQuestProgress,
} from '@/lib/mission/daily-quests'
import {
  DEFAULT_MISSION_PROFILE,
  DEFAULT_MISSION_STATS,
  type MissionProfile,
  type MissionStats,
  type MissionStreak,
} from '@/lib/mission/mission-types'
import { applyStreakMultiplier, XP_AWARDS, type XpEventType } from '@/lib/mission/xp-config'

export type MissionRow = {
  creator_xp?: number | null
  creator_level?: number | null
  mission_streak?: MissionStreak | null
  achievements?: AchievementId[] | null
  daily_quests?: (DailyQuestProgress & { date?: string }) | null
  last_active_date?: string | null
  mission_stats?: MissionStats | null
}

function parseStreak(raw: unknown): MissionStreak {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { count: 0, lastDate: null }
  }
  const o = raw as Record<string, unknown>
  return {
    count: typeof o.count === 'number' ? Math.max(0, o.count) : 0,
    lastDate: typeof o.lastDate === 'string' ? o.lastDate : null,
  }
}

function parseAchievements(raw: unknown): AchievementId[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((a): a is AchievementId => typeof a === 'string')
}

function parseDailyQuests(raw: unknown): DailyQuestProgress & { date?: string } {
  const base = defaultDailyQuestProgress()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  const pick = (id: DailyQuestId) => {
    const entry = o[id]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return base[id]
    }
    const e = entry as Record<string, unknown>
    return {
      count: typeof e.count === 'number' ? e.count : 0,
      completed: Boolean(e.completed),
      completedAt: typeof e.completedAt === 'string' ? e.completedAt : undefined,
    }
  }
  return {
    first_script: pick('first_script'),
    three_projects: pick('three_projects'),
    first_reel: pick('first_reel'),
    date: typeof o.date === 'string' ? o.date : undefined,
  }
}

function parseStats(raw: unknown): MissionStats {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_MISSION_STATS }
  }
  const o = raw as Record<string, unknown>
  return {
    scriptsCompleted: typeof o.scriptsCompleted === 'number' ? o.scriptsCompleted : 0,
    hooksCompleted: typeof o.hooksCompleted === 'number' ? o.hooksCompleted : 0,
    videosCompleted: typeof o.videosCompleted === 'number' ? o.videosCompleted : 0,
    bestStoryScore: typeof o.bestStoryScore === 'number' ? o.bestStoryScore : 0,
  }
}

export function rowToMissionProfile(row: MissionRow | null | undefined): MissionProfile {
  if (!row) return { ...DEFAULT_MISSION_PROFILE, stats: { ...DEFAULT_MISSION_STATS } }
  return {
    creator_xp: row.creator_xp ?? 0,
    creator_level: row.creator_level ?? 1,
    mission_streak: parseStreak(row.mission_streak),
    achievements: parseAchievements(row.achievements),
    daily_quests: parseDailyQuests(row.daily_quests),
    last_active_date: row.last_active_date ?? null,
    stats: parseStats(row.mission_stats),
  }
}

function updateStreak(streak: MissionStreak, today: string): MissionStreak {
  if (streak.lastDate === today) return streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  if (streak.lastDate === yesterdayStr) {
    return { count: streak.count + 1, lastDate: today }
  }
  return { count: 1, lastDate: today }
}

function ensureDailyQuests(
  quests: DailyQuestProgress & { date?: string },
  today: string
): DailyQuestProgress & { date: string } {
  if (!shouldResetDailyQuests(quests.date)) {
    return { ...quests, date: quests.date ?? today }
  }
  return { ...defaultDailyQuestProgress(), date: today }
}

export type XpAwardInput = {
  event?: XpEventType
  storyScore?: number
  incrementProjects?: boolean
}

export type XpAwardResult = {
  profile: MissionProfile
  xpGained: number
  newAchievements: AchievementId[]
  questsCompleted: DailyQuestId[]
}

export function applyXpAward(
  current: MissionProfile,
  input: XpAwardInput
): XpAwardResult {
  const today = todayDateString()
  let profile: MissionProfile = {
    ...current,
    mission_streak: updateStreak(current.mission_streak, today),
    daily_quests: ensureDailyQuests(current.daily_quests, today),
    last_active_date: today,
    stats: { ...current.stats },
  }

  let xpGained = 0

  if (input.event) {
    const baseXp = XP_AWARDS[input.event]
    xpGained = applyStreakMultiplier(baseXp, profile.mission_streak.count)
    profile.creator_xp = profile.creator_xp + xpGained
    profile.creator_level = levelFromXp(profile.creator_xp).level

    if (input.event === 'hook') {
      profile.stats.hooksCompleted += 1
    }
    if (input.event === 'script') {
      profile.stats.scriptsCompleted += 1
      const q = profile.daily_quests.first_script
      if (!q.completed) {
        profile.daily_quests.first_script = {
          count: q.count + 1,
          completed: q.count + 1 >= 1,
          completedAt: q.completed ? q.completedAt : new Date().toISOString(),
        }
        if (profile.daily_quests.first_script.completed) {
          profile.creator_xp += DAILY_QUESTS.find((d) => d.id === 'first_script')!.xpReward
        }
      }
    }
    if (input.event === 'completedProject') {
      profile.stats.videosCompleted += 1
      const q = profile.daily_quests.first_reel
      if (!q.completed) {
        profile.daily_quests.first_reel = {
          count: 1,
          completed: true,
          completedAt: new Date().toISOString(),
        }
      }
    }
  }

  if (input.incrementProjects) {
    const q = profile.daily_quests.three_projects
    if (!q.completed) {
      const count = q.count + 1
      profile.daily_quests.three_projects = {
        count,
        completed: count >= 3,
        completedAt: count >= 3 ? new Date().toISOString() : q.completedAt,
      }
      if (profile.daily_quests.three_projects.completed) {
        profile.creator_xp += DAILY_QUESTS.find((d) => d.id === 'three_projects')!.xpReward
      }
    }
  }

  if (input.storyScore != null && input.storyScore > profile.stats.bestStoryScore) {
    profile.stats.bestStoryScore = input.storyScore
  }

  profile.creator_level = levelFromXp(profile.creator_xp).level

  const progress: AchievementProgress = {
    scriptsCompleted: profile.stats.scriptsCompleted,
    hooksCompleted: profile.stats.hooksCompleted,
    videosCompleted: profile.stats.videosCompleted,
    bestStoryScore: profile.stats.bestStoryScore,
    creatorLevel: profile.creator_level,
    streakDays: profile.mission_streak.count,
  }

  const newAchievements = checkNewAchievements(progress, profile.achievements)
  if (newAchievements.length > 0) {
    profile.achievements = [...profile.achievements, ...newAchievements]
  }

  const questsCompleted: DailyQuestId[] = []
  if (
    profile.daily_quests.first_script.completed &&
    !current.daily_quests.first_script.completed
  ) {
    questsCompleted.push('first_script')
  }
  if (
    profile.daily_quests.three_projects.completed &&
    !current.daily_quests.three_projects.completed
  ) {
    questsCompleted.push('three_projects')
  }
  if (profile.daily_quests.first_reel.completed && !current.daily_quests.first_reel.completed) {
    questsCompleted.push('first_reel')
  }

  return { profile, xpGained, newAchievements, questsCompleted }
}

export function missionProfileToRow(profile: MissionProfile): Record<string, unknown> {
  return {
    creator_xp: profile.creator_xp,
    creator_level: profile.creator_level,
    mission_streak: profile.mission_streak,
    achievements: profile.achievements,
    daily_quests: profile.daily_quests,
    last_active_date: profile.last_active_date,
    mission_stats: profile.stats,
  }
}
