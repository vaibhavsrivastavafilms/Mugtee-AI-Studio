import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import type { HookCandidate } from '@/lib/virlo-engine/types'
import type { EmotionalGoal } from '@/lib/virlo-engine/types'

export const HOOK_PATTERNS = [
  'pattern-interrupt',
  'problem-first',
  'result-tease',
  'direct-callout',
  'stat-claim',
  'curiosity-gap',
  'before-after',
] as const

export type HookPattern = (typeof HOOK_PATTERNS)[number]

function hashPick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function topicLabel(topic: string): string {
  const slice = topic.length > 55 ? `${topic.slice(0, 52)}…` : topic
  return slice.replace(/^["']|["']$/g, '').trim()
}

function buildHookText(
  pattern: HookPattern,
  topic: string,
  niche: CinematicNiche,
  _emotion: EmotionalGoal,
  seed: number
): string {
  const profile = NICHE_PROFILES[niche]
  const subject = topicLabel(topic)
  const v0 = profile.vocabulary[seed % profile.vocabulary.length] ?? 'this'
  const v1 = profile.vocabulary[(seed + 1) % profile.vocabulary.length] ?? 'results'

  switch (pattern) {
    case 'pattern-interrupt':
      return `Stop scrolling — if you're working on ${subject}, this one mistake wastes weeks.`
    case 'problem-first':
      return `Most people fail at ${subject} because they skip the first step.`
    case 'result-tease':
      return `I tested ${subject} for 30 days — here's what actually moved the needle.`
    case 'direct-callout':
      return `If ${subject} feels stuck right now, watch this before you quit.`
    case 'stat-claim':
      return `90% of ${subject} advice is wrong — I learned the hard way so you don't have to.`
    case 'curiosity-gap':
      return `Nobody talks about this part of ${subject} — but it's why most people stall.`
    case 'before-after':
      return `Before I fixed my ${v0} around ${subject}, I was doing everything backwards.`
    default:
      return `Here's the ${v1} shortcut for ${subject} that creators actually use.`
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
  if (/\b(stop|most people|here's|before you|days|step|mistake|fail|works)\b/i.test(trimmed)) {
    score += 2
  }

  if (/you're not afraid|you already know|forgetting who you|quiet cost|uncomfortably familiar/i.test(trimmed)) {
    score -= 8
  }

  const profile = NICHE_PROFILES[niche]
  profile.vocabulary.forEach((word) => {
    if (trimmed.toLowerCase().includes(word.toLowerCase())) score += 1.5
  })
  profile.avoid.forEach((phrase) => {
    if (trimmed.toLowerCase().includes(phrase.toLowerCase())) score -= 4
  })

  const emotionBoost: Partial<Record<EmotionalGoal, RegExp>> = {
    curiosity: /\?|nobody|before you|here's/i,
    tension: /mistake|fail|wrong|quit|stall/i,
    recognition: /\byou\b|\byour\b|most people/i,
    defiance: /stop scrolling|wrong|before you quit/i,
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
      text: 'Most creators quit here — this 60-second fix changes that.',
      pattern: 'problem-first',
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
    `${short}: What Actually Works`,
    `Fix Your ${v} in 60 Seconds`,
    `Stop Getting ${profile.label} Wrong`,
    `The ${v} Mistake Everyone Makes`,
    `${short} — Creator Breakdown`,
  ]
}

export function pickTitle(candidates: string[], seed: number): string {
  return candidates[Math.abs(seed) % candidates.length] ?? candidates[0] ?? 'Untitled'
}
