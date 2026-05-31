export type DailyQuestId = 'first_script' | 'three_projects' | 'first_reel'

export type DailyQuest = {
  id: DailyQuestId
  title: string
  description: string
  xpReward: number
  badge?: string
  target: number
}

export const DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'first_script',
    title: 'Generate First Script',
    description: 'Complete one script today.',
    xpReward: 50,
    target: 1,
  },
  {
    id: 'three_projects',
    title: 'Create 3 Projects',
    description: 'Start three projects in one day.',
    xpReward: 100,
    target: 3,
  },
  {
    id: 'first_reel',
    title: 'Generate First Reel',
    description: 'Export your first reel today.',
    xpReward: 0,
    badge: 'Reel Pioneer',
    target: 1,
  },
]

export type DailyQuestProgress = Record<
  DailyQuestId,
  { count: number; completed: boolean; completedAt?: string }
>

export function defaultDailyQuestProgress(): DailyQuestProgress {
  return {
    first_script: { count: 0, completed: false },
    three_projects: { count: 0, completed: false },
    first_reel: { count: 0, completed: false },
  }
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function shouldResetDailyQuests(lastQuestDate: string | null | undefined): boolean {
  if (!lastQuestDate) return true
  return lastQuestDate !== todayDateString()
}
