/** HQ visual tier from XP — 1 desk → 100 empire */

export type HqTier = {
  level: number
  title: string
  description: string
  visualKey: string
}

const NAMED_HQ: Record<number, { title: string; description: string; visualKey: string }> = {
  1: { title: 'Desk Setup', description: 'A single monitor and a dream.', visualKey: 'desk' },
  5: { title: 'Creator Corner', description: 'Notes on the wall, ideas everywhere.', visualKey: 'corner' },
  10: { title: 'Home Studio', description: 'Proper lighting, proper ambition.', visualKey: 'studio' },
  20: { title: 'Production Room', description: 'Multiple screens, storyboards pinned.', visualKey: 'production' },
  35: { title: 'Creative Loft', description: 'Space to think big and ship fast.', visualKey: 'loft' },
  50: { title: 'Director Suite', description: 'Your team (AI) reports here.', visualKey: 'suite' },
  65: { title: 'Media House', description: 'A full floor of creative ops.', visualKey: 'house' },
  80: { title: 'Content Empire', description: 'Multiple worlds, one vision.', visualKey: 'empire' },
  100: { title: 'Legendary HQ', description: 'The studio others aspire to.', visualKey: 'legendary' },
}

function titleForHqLevel(level: number): HqTier {
  const clamped = Math.max(1, Math.min(100, level))
  const named = Object.keys(NAMED_HQ)
    .map(Number)
    .sort((a, b) => b - a)
    .find((l) => clamped >= l)
  const meta = named != null ? NAMED_HQ[named]! : NAMED_HQ[1]!
  return { level: clamped, ...meta }
}

/** HQ level 1–100 from total XP (mirrors mission curve, scaled to 100 tiers). */
export function hqLevelFromXp(xp: number): number {
  const clampedXp = Math.max(0, xp)
  // Map 0–12500 XP (L50 mission cap) → 1–100 HQ
  const maxXp = 12500
  const ratio = Math.min(1, clampedXp / maxXp)
  return Math.max(1, Math.min(100, Math.round(1 + ratio * 99)))
}

export function hqTierFromXp(xp: number): HqTier {
  return titleForHqLevel(hqLevelFromXp(xp))
}

export function hqProgressToNext(xp: number): { current: HqTier; progress: number; xpToNext: number } {
  const level = hqLevelFromXp(xp)
  const current = titleForHqLevel(level)
  if (level >= 100) {
    return { current, progress: 100, xpToNext: 0 }
  }
  const nextLevelXp = Math.round(((level) / 100) * 12500)
  const currentLevelXp = Math.round(((level - 1) / 100) * 12500)
  const range = nextLevelXp - currentLevelXp || 1
  const earned = xp - currentLevelXp
  const progress = Math.min(100, Math.round((earned / range) * 100))
  return { current, progress, xpToNext: Math.max(0, nextLevelXp - xp) }
}

export const HQ_VISUAL_KEYS = ['desk', 'corner', 'studio', 'production', 'loft', 'suite', 'house', 'empire', 'legendary'] as const
