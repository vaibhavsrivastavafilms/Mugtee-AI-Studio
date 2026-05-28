import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import type { HookCandidate } from '@/lib/virlo-engine/types'
import type { EmotionalGoal } from '@/lib/virlo-engine/types'

export const HOOK_PATTERNS = [
  'recognition-mirror',
  'counterintuitive-truth',
  'hidden-cost',
  'forbidden-detail',
  'before-after-gap',
  'second-person-accusation',
  'unfinished-question',
] as const

export type HookPattern = (typeof HOOK_PATTERNS)[number]

function hashPick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function buildHookText(
  pattern: HookPattern,
  topic: string,
  niche: CinematicNiche,
  emotion: EmotionalGoal,
  seed: number
): string {
  const profile = NICHE_PROFILES[niche]
  const slice = topic.length > 55 ? `${topic.slice(0, 52)}…` : topic
  const v0 = profile.vocabulary[seed % profile.vocabulary.length] ?? 'truth'
  const v1 = profile.vocabulary[(seed + 1) % profile.vocabulary.length] ?? 'pattern'
  const angle = profile.hookAngles[seed % profile.hookAngles.length] ?? 'the real reason'

  switch (pattern) {
    case 'recognition-mirror':
      return `"You already know the ${v0} in "${slice}" — you just haven't named it yet."`
    case 'counterintuitive-truth':
      return `"Everyone talks about ${slice.toLowerCase()} — almost nobody mentions the ${v1}."`
    case 'hidden-cost':
      return `"The price of ignoring ${v0} isn't failure — it's forgetting who you were."`
    case 'forbidden-detail':
      return `"This is the part nobody posts about ${profile.label.toLowerCase()}."`
    case 'before-after-gap':
      return `"Before you understood ${v0}, "${slice}" felt harmless."`
    case 'second-person-accusation':
      return `"You're not afraid of ${slice.toLowerCase()} — you're afraid of what ${v1} would demand."`
    case 'unfinished-question':
      return `"What if ${angle} was never about ${v0} at all?"`
    default:
      return `"Most people miss the ${v0} in "${slice}."`
  }
}

function scoreHookTension(
  text: string,
  niche: CinematicNiche,
  emotion: EmotionalGoal
): number {
  let score = 0
  const trimmed = text.replace(/^"|"$/g, '').trim()
  if (trimmed.length < 14) return -5
  if (trimmed.length > 180) score -= 2
  if (trimmed.length <= 120) score += 2

  if (/\?/.test(trimmed)) score += 1.5
  if (/\b(you|your)\b/i.test(trimmed)) score += 2
  if (/—/.test(trimmed)) score += 1
  if (/nobody|never|before|until|afraid|hidden|miss/i.test(trimmed)) score += 1.5

  const profile = NICHE_PROFILES[niche]
  profile.vocabulary.forEach((word) => {
    if (trimmed.toLowerCase().includes(word.toLowerCase())) score += 1.5
  })
  profile.avoid.forEach((phrase) => {
    if (trimmed.toLowerCase().includes(phrase.toLowerCase())) score -= 4
  })

  const emotionBoost: Partial<Record<EmotionalGoal, RegExp>> = {
    curiosity: /\?|what if|why|hidden/i,
    tension: /cost|afraid|before|until|price/i,
    recognition: /\byou\b|\byour\b|already know/i,
    defiance: /not afraid|nobody|refuse|truth/i,
  }
  const boost = emotionBoost[emotion]
  if (boost?.test(trimmed)) score += 2

  return score
}

export function generateHookCandidates(
  topic: string,
  niche: CinematicNiche,
  emotion: EmotionalGoal,
  seed: number,
  count = 5
): HookCandidate[] {
  const patterns = [...HOOK_PATTERNS]
  const rotated = [
    ...patterns.slice(seed % patterns.length),
    ...patterns.slice(0, seed % patterns.length),
  ]

  const candidates: HookCandidate[] = []
  for (let i = 0; i < Math.min(count, rotated.length); i++) {
    const pattern = rotated[i]
    const text = buildHookText(pattern, topic, niche, emotion, seed + i * 7)
    candidates.push({
      text,
      pattern,
      variant: `${pattern}-v${(seed + i) % 9}`,
      tensionScore: scoreHookTension(text, niche, emotion),
    })
  }

  return candidates.sort((a, b) => b.tensionScore - a.tensionScore)
}

export function pickStrongestHookCandidate(candidates: HookCandidate[]): HookCandidate {
  if (!candidates.length) {
    return {
      text: '"Something in this story will feel uncomfortably familiar."',
      pattern: 'recognition-mirror',
      variant: 'fallback-v0',
      tensionScore: 0,
    }
  }
  return candidates[0]
}

/** Rotate Virlo hook structure based on how many hooks were already tried this session. */
export function rotatedHookPattern(attemptIndex: number): HookPattern {
  const idx = Math.abs(attemptIndex) % HOOK_PATTERNS.length
  return HOOK_PATTERNS[idx]
}

export function pickRotatedHookCandidate(
  topic: string,
  niche: CinematicNiche,
  emotion: EmotionalGoal,
  baseSeed: number,
  attemptIndex: number,
  isTooSimilar: (text: string) => boolean
): HookCandidate {
  const rotationOffset = attemptIndex + 1
  const seed = baseSeed + rotationOffset * 7919

  for (let pass = 0; pass < HOOK_PATTERNS.length; pass++) {
    const pattern = rotatedHookPattern(attemptIndex + pass)
    const text = buildHookText(pattern, topic, niche, emotion, seed + pass * 13)
    if (!isTooSimilar(text)) {
      return {
        text,
        pattern,
        variant: `${pattern}-v${(seed + pass) % 9}`,
        tensionScore: scoreHookTension(text, niche, emotion),
      }
    }
  }

  const fallbackPattern = rotatedHookPattern(attemptIndex)
  const fallbackText = buildHookText(
    fallbackPattern,
    topic,
    niche,
    emotion,
    seed + attemptIndex * 31
  )
  return {
    text: fallbackText,
    pattern: fallbackPattern,
    variant: `${fallbackPattern}-v${(seed + attemptIndex) % 9}`,
    tensionScore: scoreHookTension(fallbackText, niche, emotion),
  }
}

export function generateTitleCandidates(
  topic: string,
  niche: CinematicNiche,
  seed: number
): string[] {
  const locked = inferNicheFromBrief({ topic, niche })
  const profile = NICHE_PROFILES[locked]
  const short = topic.length > 48 ? `${topic.slice(0, 45)}…` : topic
  const v = hashPick(profile.vocabulary, seed)

  return [
    `The ${v} Nobody Names`,
    `${short}: A ${profile.label} Truth`,
    `What ${profile.label} Gets Wrong About "${short.slice(0, 30)}"`,
    `Before You Scroll — ${short}`,
    `The Quiet Cost of ${v}`,
  ]
}

export function pickTitle(candidates: string[], seed: number): string {
  return candidates[Math.abs(seed) % candidates.length] ?? candidates[0] ?? 'Untitled'
}
