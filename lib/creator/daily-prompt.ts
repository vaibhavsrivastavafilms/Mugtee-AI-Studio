import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { getCreatorPreference } from '@/lib/creator/creator-memory'

const DAILY_NICHES = [
  'psychology',
  'luxury',
  'documentary',
  'motivation',
] as const

type DailyNiche = (typeof DAILY_NICHES)[number]

const NICHE_PROMPTS: Record<DailyNiche, string[]> = {
  psychology: [
    'Why your brain chooses comfort over growth',
    'The attachment pattern nobody talks about',
    'What avoidance actually costs you',
    'The hidden reason you repeat the same mistake',
  ],
  luxury: [
    'Luxury is quiet — what money cannot buy',
    'The detail nobody notices until it is gone',
    'Why restraint reads as power',
    'Craft over flash — the standard that lasts',
  ],
  documentary: [
    'What the camera noticed that you missed',
    'The line they never said out loud',
    'Evidence of a life lived in silence',
    'The moment truth arrived without warning',
  ],
  motivation: [
    'Nobody talks about discipline like this',
    'The moment discipline becomes identity',
    'Why successful people feel empty',
    'The comeback nobody saw coming',
  ],
}

export type DailyPrompt = {
  prompt: string
  niche: DailyNiche
  nicheLabel: string
  dayIndex: number
}

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function resolveNiche(): DailyNiche {
  const remembered = getCreatorPreference('lastNiche')
  if (remembered && (DAILY_NICHES as readonly string[]).includes(remembered)) {
    return remembered as DailyNiche
  }
  const day = dayOfYear()
  return DAILY_NICHES[day % DAILY_NICHES.length]
}

/** Niche-aware daily prompt — rotates by calendar day, prefers remembered niche. */
export function getDailyPrompt(): DailyPrompt {
  const dayIndex = dayOfYear()
  const niche = resolveNiche()
  const pool = NICHE_PROMPTS[niche]
  const prompt = pool[dayIndex % pool.length]
  const profile = NICHE_PROFILES[niche]

  return {
    prompt,
    niche,
    nicheLabel: profile.label,
    dayIndex,
  }
}

export function getAlternateDailyPrompts(count = 2): DailyPrompt[] {
  const primary = getDailyPrompt()
  const dayIndex = dayOfYear()
  const results: DailyPrompt[] = [primary]

  for (let i = 1; results.length < count + 1; i++) {
    const niche = DAILY_NICHES[(dayIndex + i) % DAILY_NICHES.length]
    const pool = NICHE_PROMPTS[niche]
    const prompt = pool[(dayIndex + i) % pool.length]
    if (results.some((r) => r.prompt === prompt)) continue
    results.push({
      prompt,
      niche,
      nicheLabel: NICHE_PROFILES[niche].label,
      dayIndex: dayIndex + i,
    })
  }

  return results.slice(0, count + 1)
}
