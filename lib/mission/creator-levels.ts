export type CreatorLevel = {
  level: number
  title: string
  xpRequired: number
}

const NAMED_LEVELS: Record<number, string> = {
  1: 'Story Explorer',
  5: 'Hook Hunter',
  10: 'Script Spark',
  15: 'Scene Architect',
  20: 'Visual Director',
  25: 'Voice Crafter',
  30: 'Reel Maker',
  35: 'Audience Builder',
  40: 'Viral Strategist',
  45: 'Content Maestro',
  50: 'Creator Legend',
}

function titleForLevel(level: number): string {
  const named = Object.keys(NAMED_LEVELS)
    .map(Number)
    .sort((a, b) => b - a)
    .find((l) => level >= l)
  return named != null ? NAMED_LEVELS[named]! : 'Rising Creator'
}

/** XP threshold for each level (level 1 = 0, level 50 = 12500). */
export function xpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(50, level))
  if (clamped === 1) return 0
  // Progressive curve: ~50 XP at L2, ~12500 at L50
  return Math.round(50 * Math.pow(clamped - 1, 1.85))
}

export function levelFromXp(xp: number): CreatorLevel {
  let level = 1
  for (let l = 50; l >= 1; l--) {
    if (xp >= xpForLevel(l)) {
      level = l
      break
    }
  }
  return {
    level,
    title: titleForLevel(level),
    xpRequired: xpForLevel(level),
  }
}

export function nextLevelProgress(xp: number): {
  current: CreatorLevel
  next: CreatorLevel | null
  progress: number
  xpToNext: number
} {
  const current = levelFromXp(xp)
  if (current.level >= 50) {
    return { current, next: null, progress: 100, xpToNext: 0 }
  }
  const nextLevel = current.level + 1
  const next: CreatorLevel = {
    level: nextLevel,
    title: titleForLevel(nextLevel),
    xpRequired: xpForLevel(nextLevel),
  }
  const range = next.xpRequired - current.xpRequired
  const earned = xp - current.xpRequired
  const progress = range > 0 ? Math.min(100, Math.round((earned / range) * 100)) : 100
  return { current, next, progress, xpToNext: Math.max(0, next.xpRequired - xp) }
}

export const CREATOR_LEVELS: CreatorLevel[] = Array.from({ length: 50 }, (_, i) => {
  const level = i + 1
  return { level, title: titleForLevel(level), xpRequired: xpForLevel(level) }
})
