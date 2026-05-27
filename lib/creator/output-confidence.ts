import { NICHE_PROFILES, type CinematicNiche } from '@/lib/cinematic/niches'

export const OUTPUT_CONFIDENCE_LINES = [
  'Cinematic pacing optimized',
  'Emotional rhythm shaped for vertical storytelling',
  'Scene beats aligned to your arc',
  'Directed for retention without losing tone',
] as const

const NICHE_LINES: Partial<Record<CinematicNiche, string>> = {
  documentary: 'Optimized for documentary pacing',
  psychology: 'Balanced for emotional cadence',
  luxury: 'Visual rhythm preserved',
  motivation: 'Structured for short-form retention',
  storytelling: 'Balanced for emotional cadence',
  'faceless reels': 'Structured for short-form retention',
  finance: 'Structured for short-form retention',
}

const STYLE_LINES: Record<string, string> = {
  documentary: 'Optimized for documentary pacing',
  cinematic: 'Visual rhythm preserved',
  emotional: 'Balanced for emotional cadence',
  motivational: 'Structured for short-form retention',
}

const PLATFORM_LINES: Record<string, string> = {
  instagram_reel: 'Structured for short-form retention',
  tiktok: 'Structured for short-form retention',
  youtube_shorts: 'Structured for short-form retention',
}

export function nicheConfidenceLine(niche?: string | null): string {
  const profile = niche ? NICHE_PROFILES[niche as CinematicNiche] : null
  if (niche && NICHE_LINES[niche as CinematicNiche]) {
    return NICHE_LINES[niche as CinematicNiche]!
  }
  if (profile) {
    return `Refined for ${profile.label.toLowerCase()} storytelling`
  }
  return 'Refined for your niche'
}

export function getContextualConfidenceLines(input: {
  niche?: string | null
  style?: string | null
  platform?: string | null
  rewriteMode?: string | null
}): [string, string] {
  const primary = OUTPUT_CONFIDENCE_LINES[0]
  const rewrite = input.rewriteMode || input.style
  const secondary =
    (rewrite && STYLE_LINES[rewrite]) ||
    (input.platform && PLATFORM_LINES[input.platform]) ||
    nicheConfidenceLine(input.niche)
  return [primary, secondary]
}

export const REFINEMENT_CONTINUITY_LINE =
  'Visual continuity preserved · story pacing maintained'

export const REFINEMENT_PACING_LINE = 'Story pacing preserved across your arc'
