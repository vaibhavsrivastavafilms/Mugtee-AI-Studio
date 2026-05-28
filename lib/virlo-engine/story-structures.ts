import type { CinematicNiche } from '@/lib/cinematic/niches'
import type {
  PacingStyle,
  RetentionType,
  StoryStructureFormat,
  StoryStructureId,
} from '@/lib/virlo-engine/types'

export const STORY_STRUCTURES: Record<StoryStructureId, StoryStructureFormat> = {
  'psychological-reveal': {
    id: 'psychological-reveal',
    formatNumber: 1,
    name: 'Psychological Reveal',
    pattern: [
      'Mirror a private behavior the viewer recognizes but never names.',
      'Introduce the hidden mechanism driving that behavior.',
      'Reveal the emotional payoff of seeing the pattern clearly.',
      'Close with a single reframe — not advice, recognition.',
    ],
    bestForNiches: ['psychology', 'spirituality', 'storytelling'],
    pacingHint: 'slow-burn',
    retentionType: 'curiosity-gap',
    openingMove: 'Second-person recognition beat — "You already know this feeling."',
    midpointTurn: 'Name the invisible pattern without jargon.',
    closingMove: 'Quiet reframe the viewer carries away.',
  },
  'documentary-tension': {
    id: 'documentary-tension',
    formatNumber: 2,
    name: 'Documentary Tension',
    pattern: [
      'Establish observational stakes — what is at risk if untold.',
      'Layer evidence: detail, witness, contradiction.',
      'Hold back the thesis until the viewer needs it.',
      'Land truth as observation, not opinion.',
    ],
    bestForNiches: ['documentary', 'finance', 'luxury'],
    pacingHint: 'documentary',
    retentionType: 'open-loop',
    openingMove: 'Concrete image + unanswered question.',
    midpointTurn: 'Contradiction or counter-evidence.',
    closingMove: 'Verité stillness — let the fact breathe.',
  },
  'fast-viral-retention': {
    id: 'fast-viral-retention',
    formatNumber: 3,
    name: 'Fast Viral Retention',
    pattern: [
      'Pattern interrupt in first 1.5 seconds.',
      'Stack 3 micro-reveals with rising stakes.',
      'Open loop at midpoint — promise payoff.',
      'Snap payoff + aftertaste line under 8 words.',
    ],
    bestForNiches: ['motivation', 'fitness', 'faceless reels'],
    pacingHint: 'staccato',
    retentionType: 'escalation-ladder',
    openingMove: 'Visual shock or counterintuitive claim.',
    midpointTurn: 'Escalation — "And it gets worse."',
    closingMove: 'Punchy identity line or challenge.',
  },
  'emotional-cinema': {
    id: 'emotional-cinema',
    formatNumber: 4,
    name: 'Emotional Cinema',
    pattern: [
      'Sensory opening — texture, light, breath.',
      'Build emotional contour through visual metaphor.',
      'Peak beat: one image carries the entire thesis.',
      'Lingering close — feeling over explanation.',
    ],
    bestForNiches: ['luxury', 'storytelling', 'spirituality'],
    pacingHint: 'slow-burn',
    retentionType: 'pattern-interrupt',
    openingMove: 'Cinematic sensory detail — no exposition.',
    midpointTurn: 'Visual metaphor lands the emotional truth.',
    closingMove: 'Hold on stillness; aftertaste > CTA.',
  },
}

export function selectStoryStructure(
  niche: CinematicNiche,
  retentionType: RetentionType,
  pacingStyle: PacingStyle,
  seed: number,
  avoidIds: StoryStructureId[] = []
): StoryStructureFormat {
  const candidates = Object.values(STORY_STRUCTURES).filter(
    (s) => !avoidIds.includes(s.id)
  )

  const scored = candidates.map((structure) => {
    let score = 0
    if (structure.bestForNiches.includes(niche)) score += 4
    if (structure.retentionType === retentionType) score += 2
    if (structure.pacingHint === pacingStyle) score += 2
    score += (seed + structure.formatNumber) % 3
    return { structure, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.structure ?? STORY_STRUCTURES['emotional-cinema']
}

export function getStoryStructureById(id: StoryStructureId): StoryStructureFormat {
  return STORY_STRUCTURES[id]
}
