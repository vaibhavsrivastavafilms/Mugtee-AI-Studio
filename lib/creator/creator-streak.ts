export type CreatorStreakData = {
  currentStreak: number
  bestStreak: number
  totalDaysOpened: number
  workflowsCreated: number
  exportsCompleted: number
  lastVisitDate: string | null
  milestonesShown: number[]
  updatedAt: string
}

export const STREAK_MILESTONES = [3, 7, 14, 30] as const
export type StreakMilestone = (typeof STREAK_MILESTONES)[number]

const STORAGE_PREFIX = 'mugtee:creator:streak:v1'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function emptyStreak(): CreatorStreakData {
  return {
    currentStreak: 0,
    bestStreak: 0,
    totalDaysOpened: 0,
    workflowsCreated: 0,
    exportsCompleted: 0,
    lastVisitDate: null,
    milestonesShown: [],
    updatedAt: new Date().toISOString(),
  }
}

function readStreak(userId: string): CreatorStreakData {
  if (typeof window === 'undefined' || !userId) return emptyStreak()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyStreak()
    return { ...emptyStreak(), ...JSON.parse(raw) }
  } catch {
    return emptyStreak()
  }
}

function writeStreak(userId: string, data: CreatorStreakData): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
    )
  } catch {
    /* quota or private mode */
  }
}

function applyVisit(data: CreatorStreakData, today: string): CreatorStreakData {
  if (data.lastVisitDate === today) return data

  const yesterday = yesterdayKey()
  let currentStreak = data.currentStreak

  if (data.lastVisitDate === yesterday) {
    currentStreak += 1
  } else if (data.lastVisitDate === null) {
    currentStreak = 1
  } else {
    currentStreak = 1
  }

  return {
    ...data,
    lastVisitDate: today,
    currentStreak,
    bestStreak: Math.max(data.bestStreak, currentStreak),
    totalDaysOpened: data.totalDaysOpened + 1,
  }
}

/** Record a studio visit — call once per session on app open. Returns new milestone if reached. */
export function recordStudioVisit(userId: string): {
  data: CreatorStreakData
  newMilestone: StreakMilestone | null
} {
  const today = todayKey()
  const prev = readStreak(userId)
  const next = applyVisit(prev, today)
  writeStreak(userId, next)
  const newMilestone = detectNewMilestone(prev, next)
  if (newMilestone) markMilestoneShown(userId, newMilestone)
  return { data: next, newMilestone }
}

function detectNewMilestone(
  prev: CreatorStreakData,
  next: CreatorStreakData
): StreakMilestone | null {
  for (const m of STREAK_MILESTONES) {
    if (next.currentStreak >= m && prev.currentStreak < m && !next.milestonesShown.includes(m)) {
      return m
    }
  }
  return null
}

function markMilestoneShown(userId: string, milestone: StreakMilestone): void {
  const data = readStreak(userId)
  if (data.milestonesShown.includes(milestone)) return
  writeStreak(userId, {
    ...data,
    milestonesShown: [...data.milestonesShown, milestone],
  })
}

export function recordWorkflowCreated(userId: string): CreatorStreakData {
  const data = readStreak(userId)
  const next = { ...data, workflowsCreated: data.workflowsCreated + 1 }
  writeStreak(userId, next)
  return next
}

export function recordExportCompleted(userId: string): CreatorStreakData {
  const data = readStreak(userId)
  const next = { ...data, exportsCompleted: data.exportsCompleted + 1 }
  writeStreak(userId, next)
  return next
}

export function getCreatorStreak(userId: string): CreatorStreakData {
  return readStreak(userId)
}

export function streakMilestoneMessage(milestone: StreakMilestone): string {
  switch (milestone) {
    case 3:
      return 'Three days in the studio — your rhythm is forming.'
    case 7:
      return 'Seven-day streak — cinematic momentum held.'
    case 14:
      return 'Two weeks of creating — the world you build endures.'
    case 30:
      return 'Thirty days — a directing practice, not a habit.'
    default:
      return `${milestone}-day streak — keep the lens alive.`
  }
}
