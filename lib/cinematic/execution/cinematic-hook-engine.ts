import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { pickStrongestHook } from '@/lib/cinematic/validation'

const CINEMATIC_OPENING_PATTERNS = [
  /^"/,
  /\b(you|your)\b/i,
  /\b(never|always|still|quietly|before)\b/i,
  /\b(what if|the moment|the day)\b/i,
  /\?$/,
]

const WEAK_OPENINGS = [
  /^in today/i,
  /^have you ever wondered/i,
  /^let me tell you/i,
  /^this is the story/i,
  /viral/i,
  /algorithm/i,
  /content creator/i,
]

function scoreHookCandidate(candidate: string, niche: CinematicNiche): number {
  let score = 0
  const text = candidate.trim()
  if (!text || text.length < 14) return -10
  if (text.length > 180) score -= 2

  CINEMATIC_OPENING_PATTERNS.forEach((p) => {
    if (p.test(text)) score += 2
  })
  WEAK_OPENINGS.forEach((p) => {
    if (p.test(text)) score -= 6
  })

  const profile = NICHE_PROFILES[niche]
  profile.vocabulary.forEach((word) => {
    if (text.toLowerCase().includes(word.toLowerCase())) score += 2.5
  })
  profile.avoid.forEach((phrase) => {
    if (text.toLowerCase().includes(phrase.toLowerCase())) score -= 5
  })

  if (/[.!?…]$/.test(text)) score += 1
  if (text.split(/\s+/).length <= 18) score += 1.5

  return score
}

export function selectCinematicHook(
  variations: string[],
  niche: CinematicNiche,
  fallback?: string
): string {
  const candidates = [...variations, fallback].filter(Boolean) as string[]
  if (!candidates.length) return ''

  let best = candidates[0]
  let bestScore = -Infinity
  for (const c of candidates) {
    const s = scoreHookCandidate(c, niche)
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }

  if (bestScore <= -5) {
    return pickStrongestHook(candidates, niche)
  }
  return best.replace(/^"|"$/g, '').trim()
}

export function generateHookVariations(
  topic: string,
  niche: CinematicNiche
): string[] {
  const profile = NICHE_PROFILES[niche]
  const slice = topic.slice(0, 60)
  const v = profile.vocabulary[0] ?? 'silence'
  return [
    `"Most people miss the ${v} in "${slice}".`,
    `You were never afraid of ${slice} — you were afraid of what it would cost.`,
    `This is the part nobody posts about ${profile.label.toLowerCase()}.`,
  ]
}
