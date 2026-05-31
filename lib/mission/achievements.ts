export type AchievementId =
  | 'first_script'
  | 'first_hook'
  | 'first_export'
  | 'hooks_100'
  | 'videos_10'
  | 'first_viral'
  | 'director_rank'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'story_score_80'
  | 'story_score_90'
  | 'ten_scripts'
  | 'five_exports'

export type Achievement = {
  id: AchievementId
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_script: {
    id: 'first_script',
    title: 'First Script',
    description: 'Completed your first cinematic script.',
    icon: '📝',
  },
  first_hook: {
    id: 'first_hook',
    title: 'First Hook',
    description: 'Crafted your first scroll-stopping hook.',
    icon: '🪝',
  },
  first_export: {
    id: 'first_export',
    title: 'First Export',
    description: 'Exported your first creator pack.',
    icon: '📦',
  },
  hooks_100: {
    id: 'hooks_100',
    title: '100 Hooks',
    description: 'Crafted 100 scroll-stopping hooks.',
    icon: '🪝',
  },
  videos_10: {
    id: 'videos_10',
    title: '10 Videos',
    description: 'Produced 10 reels with Mugtee.',
    icon: '🎬',
  },
  first_viral: {
    id: 'first_viral',
    title: 'First Viral Project',
    description: 'Story score hit 85+ on a completed project.',
    icon: '🔥',
  },
  director_rank: {
    id: 'director_rank',
    title: 'Director Rank',
    description: 'Reached Creator Level 20.',
    icon: '🎥',
  },
  streak_3: {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Created three days in a row.',
    icon: '🔥',
  },
  streak_7: {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'One week of consistent creation.',
    icon: '🔥',
  },
  streak_30: {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'A full month of daily creation.',
    icon: '💫',
  },
  story_score_80: {
    id: 'story_score_80',
    title: 'Story Score 80+',
    description: 'Hit an 80+ story score on a project.',
    icon: '⭐',
  },
  story_score_90: {
    id: 'story_score_90',
    title: 'Story Score 90+',
    description: 'Hit a 90+ story score on a project.',
    icon: '🌟',
  },
  ten_scripts: {
    id: 'ten_scripts',
    title: '10 Scripts',
    description: 'Completed ten cinematic scripts.',
    icon: '📚',
  },
  five_exports: {
    id: 'five_exports',
    title: '5 Exports',
    description: 'Exported five creator packs.',
    icon: '🚀',
  },
}

export type AchievementProgress = {
  scriptsCompleted: number
  hooksCompleted: number
  videosCompleted: number
  bestStoryScore: number
  creatorLevel: number
  streakDays: number
}

export function checkNewAchievements(
  progress: AchievementProgress,
  unlocked: AchievementId[]
): AchievementId[] {
  const next: AchievementId[] = []
  const has = (id: AchievementId) => unlocked.includes(id)

  if (progress.hooksCompleted >= 1 && !has('first_hook')) next.push('first_hook')
  if (progress.scriptsCompleted >= 1 && !has('first_script')) next.push('first_script')
  if (progress.videosCompleted >= 1 && !has('first_export')) next.push('first_export')
  if (progress.scriptsCompleted >= 10 && !has('ten_scripts')) next.push('ten_scripts')
  if (progress.videosCompleted >= 5 && !has('five_exports')) next.push('five_exports')
  if (progress.hooksCompleted >= 100 && !has('hooks_100')) next.push('hooks_100')
  if (progress.videosCompleted >= 10 && !has('videos_10')) next.push('videos_10')
  if (progress.bestStoryScore >= 80 && !has('story_score_80')) next.push('story_score_80')
  if (progress.bestStoryScore >= 85 && !has('first_viral')) next.push('first_viral')
  if (progress.bestStoryScore >= 90 && !has('story_score_90')) next.push('story_score_90')
  if (progress.creatorLevel >= 20 && !has('director_rank')) next.push('director_rank')
  if (progress.streakDays >= 3 && !has('streak_3')) next.push('streak_3')
  if (progress.streakDays >= 7 && !has('streak_7')) next.push('streak_7')
  if (progress.streakDays >= 30 && !has('streak_30')) next.push('streak_30')

  return next
}
