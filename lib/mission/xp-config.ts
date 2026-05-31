/** XP awarded per mission milestone during generation. */
export const XP_AWARDS = {
  hook: 10,
  script: 25,
  scenes: 20,
  visualPack: 30,
  completedProject: 100,
} as const

export type XpEventType = keyof typeof XP_AWARDS

/** Streak multiplier at 7+ consecutive days. */
export const STREAK_MULTIPLIER_THRESHOLD = 7
export const STREAK_XP_MULTIPLIER = 1.1

export function applyStreakMultiplier(baseXp: number, streakDays: number): number {
  if (streakDays >= STREAK_MULTIPLIER_THRESHOLD) {
    return Math.round(baseXp * STREAK_XP_MULTIPLIER)
  }
  return baseXp
}
