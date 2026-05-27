const MORNING_GUIDANCE = [
  'Start with the moment people ignore.',
  'A powerful hook begins with tension.',
  'Open on action — emotion follows.',
  'Lead with a decision, not a definition.',
] as const

const NIGHT_GUIDANCE = [
  'The best documentary openings feel unfinished.',
  'Let silence carry the first beat.',
  'Start with memory, not explanation.',
  'Cinematic stories breathe in the dark.',
] as const

const MIDDAY_GUIDANCE = [
  'A powerful hook begins with tension.',
  'Start with the moment people ignore.',
  'The best documentary openings feel unfinished.',
  'Direct emotion first — context second.',
] as const

const MORNING_PROMPTS = [
  'Nobody talks about discipline like this',
  'Why successful people feel empty',
  'The hidden psychology of attention',
  'The moment discipline becomes identity',
] as const

const NIGHT_PROMPTS = [
  'Luxury is quiet',
  'What the camera noticed that you missed',
  'The cost of always being understood',
  'The silence before a comeback',
] as const

function hourBucket(): 'morning' | 'midday' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 20 || hour < 6) return 'night'
  return 'midday'
}

function rotatePool<T extends readonly string[]>(pool: T, count: number): T[number][] {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 6))
  const offset = day % pool.length
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)]
  return rotated.slice(0, count) as T[number][]
}

export function getTimeAwareGuidanceLine(): string {
  const bucket = hourBucket()
  const pool =
    bucket === 'morning'
      ? MORNING_GUIDANCE
      : bucket === 'night'
        ? NIGHT_GUIDANCE
        : MIDDAY_GUIDANCE
  const refresh = getRefreshOffset()
  return pool[refresh % pool.length]
}

export function getTimeAwareInspirationPrompts(count = 3): string[] {
  const bucket = hourBucket()
  const pool = bucket === 'night' ? NIGHT_PROMPTS : MORNING_PROMPTS
  return rotatePool(pool, count)
}

function getRefreshOffset(): number {
  if (typeof window === 'undefined') return 0
  try {
    const key = 'mugtee:inspiration:refresh:v1'
    const prev = Number(sessionStorage.getItem(key) || '0')
    const next = prev + 1
    sessionStorage.setItem(key, String(next))
    return next
  } catch {
    return 0
  }
}
