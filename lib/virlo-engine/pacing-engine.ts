import type { PacingProfile, PacingStyle } from '@/lib/virlo-engine/types'
import type { StoryStructureFormat } from '@/lib/virlo-engine/types'

const PACING_CONFIG: Record<
  PacingStyle,
  Omit<PacingProfile, 'style'>
> = {
  'slow-burn': {
    avgSentenceWords: 14,
    transitionStyle: 'Breath gaps — em dashes, ellipses, held pauses between beats.',
    rhythmNotes: [
      'Longer sentences in build; shorter at peak.',
      'Allow 0.5s visual holds without narration.',
      'Transitions feel like exhale, not cut.',
    ],
    narrationIntensity: 'measured',
  },
  balanced: {
    avgSentenceWords: 11,
    transitionStyle: 'Clean pivot phrases — "But here is the part…" / "And yet…"',
    rhythmNotes: [
      'Alternate statement and image-led lines.',
      'One rhetorical question per scene max.',
      'Scene endings land on nouns, not adjectives.',
    ],
    narrationIntensity: 'cinematic',
  },
  staccato: {
    avgSentenceWords: 7,
    transitionStyle: 'Hard cuts — no connective tissue; stack verbs.',
    rhythmNotes: [
      'Hook window: max 12 words per line.',
      'Three-beat escalation — each line shorter than the last.',
      'Payoff: single sentence under 10 words.',
    ],
    narrationIntensity: 'urgent',
  },
  documentary: {
    avgSentenceWords: 12,
    transitionStyle: 'Observational bridges — "The camera notices…" / "What follows…"',
    rhythmNotes: [
      'Present tense for immediacy.',
      'Specific detail over abstraction.',
      'Silence is a transition — do not over-narrate.',
    ],
    narrationIntensity: 'whisper',
  },
}

const INTENSITY_ROTATION: PacingProfile['narrationIntensity'][] = [
  'whisper',
  'measured',
  'cinematic',
  'urgent',
]

export function buildPacingProfile(
  style: PacingStyle,
  structure: StoryStructureFormat,
  seed: number
): PacingProfile {
  const base = PACING_CONFIG[style]
  const intensity =
    style === 'slow-burn' && seed % 3 === 0
      ? 'whisper'
      : INTENSITY_ROTATION[(seed + structure.formatNumber) % INTENSITY_ROTATION.length]

  return {
    style,
    ...base,
    narrationIntensity: intensity,
    rhythmNotes: [
      ...base.rhythmNotes,
      `Structure rhythm: ${structure.name} — ${structure.pacingHint}.`,
    ],
  }
}

export function pacingPromptFragment(profile: PacingProfile): string {
  return [
    `Pacing: ${profile.style} (~${profile.avgSentenceWords} words/sentence avg).`,
    `Narration intensity: ${profile.narrationIntensity}.`,
    `Transitions: ${profile.transitionStyle}`,
    ...profile.rhythmNotes.map((n) => `- ${n}`),
  ].join('\n')
}
