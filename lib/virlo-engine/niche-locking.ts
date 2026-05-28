import type { CinematicNiche } from '@/lib/cinematic/niches'
import { inferNicheFromBrief, NICHE_PROFILES } from '@/lib/cinematic/niches'
import type { TopicAnalysis } from '@/lib/virlo-engine/types'
import type { PacingStyle } from '@/lib/virlo-engine/types'
import { detectEmotionalGoal } from '@/lib/virlo-engine/emotion-engine'
import { inferRetentionType } from '@/lib/virlo-engine/retention-engine'
import { selectStoryStructure } from '@/lib/virlo-engine/story-structures'

const NICHE_SIGNALS: Record<CinematicNiche, string[]> = {
  motivation: ['discipline', 'habit', 'success', 'grind', 'mindset', 'goal'],
  psychology: ['brain', 'trauma', 'attachment', 'anxiety', 'behavior', 'pattern'],
  luxury: ['wealth', 'craft', 'design', 'heritage', 'exclusive', 'quality'],
  documentary: ['history', 'truth', 'witness', 'archive', 'real', 'story'],
  finance: ['money', 'invest', 'debt', 'wealth', 'budget', 'compound'],
  fitness: ['workout', 'gym', 'body', 'muscle', 'train', 'health'],
  spirituality: ['soul', 'meditation', 'faith', 'energy', 'purpose', 'peace'],
  storytelling: ['story', 'narrative', 'character', 'plot', 'arc', 'fiction'],
  'faceless reels': ['reels', 'viral', 'scroll', 'algorithm', 'content', 'faceless'],
}

const PLATFORM_BEHAVIOR: Record<string, string> = {
  instagram_reel:
    'Hook in 1.2s; vertical 9:16; captions assume sound-off first 2s; loop-friendly close.',
  youtube_short:
    'Title card energy in hook; slightly longer breath allowed; end with subscribe-adjacent curiosity.',
  youtube_video:
    'Chapter-like scene titles; slower open acceptable; retention via mid-roll re-hook.',
}

export function detectNicheFromTopic(
  topic: string,
  tone?: string,
  explicitNiche?: string
): CinematicNiche {
  const lower = topic.toLowerCase()
  let best: CinematicNiche = inferNicheFromBrief({
    topic,
    tone,
    niche: explicitNiche,
  })
  let bestScore = 0

  for (const [niche, signals] of Object.entries(NICHE_SIGNALS) as [
    CinematicNiche,
    string[],
  ][]) {
    const score = signals.reduce((s, word) => s + (lower.includes(word) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = niche
    }
  }

  if (explicitNiche) {
    return inferNicheFromBrief({ topic, tone, niche: explicitNiche })
  }

  return bestScore > 0 ? best : inferNicheFromBrief({ topic, tone })
}

export function nicheVocabulary(niche: CinematicNiche): string[] {
  return NICHE_PROFILES[niche].vocabulary
}

export function inferPacingStyle(
  niche: CinematicNiche,
  duration: number,
  seed: number
): PacingStyle {
  if (niche === 'documentary') return 'documentary'
  if (niche === 'luxury' || niche === 'spirituality') return 'slow-burn'
  if (duration <= 30 || niche === 'motivation' || niche === 'fitness') return 'staccato'
  if (seed % 4 === 0) return 'balanced'
  return duration >= 75 ? 'slow-burn' : 'balanced'
}

export function analyzeTopic(
  idea: string,
  options?: {
    tone?: string
    duration?: number
    platform?: string
    niche?: string
    seed?: number
  }
): TopicAnalysis {
  const duration = options?.duration ?? 60
  const seed =
    options?.seed ??
    Math.abs(hashString(idea) ^ (typeof Date !== 'undefined' ? Date.now() : 0))
  const niche = detectNicheFromTopic(idea, options?.tone, options?.niche)
  const emotionalGoal = detectEmotionalGoal(idea, niche, seed)
  const pacingStyle = inferPacingStyle(niche, duration, seed)
  const retentionType = inferRetentionType(emotionalGoal, duration, seed)
  const structure = selectStoryStructure(niche, retentionType, pacingStyle, seed)
  const platform = options?.platform ?? 'instagram_reel'

  return {
    niche,
    emotionalGoal,
    pacingStyle,
    retentionType,
    platformBehavior:
      PLATFORM_BEHAVIOR[platform] ?? PLATFORM_BEHAVIOR.instagram_reel,
    recommendedStructure: structure.id,
  }
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h
}
