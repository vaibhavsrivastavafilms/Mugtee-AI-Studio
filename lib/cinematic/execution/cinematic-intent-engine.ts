import type { CinematicNiche } from '@/lib/cinematic/niches'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'

export type CinematicIntent = {
  topic: string
  niche: CinematicNiche
  emotionalCore: string
  suggestedDuration: number
  directingNote: string
}

const EMOTIONAL_MARKERS: Record<string, string> = {
  loss: 'grief held with restraint',
  love: 'tenderness without sentimentality',
  fear: 'quiet dread, not horror',
  identity: 'self-recognition, intimate',
  memory: 'nostalgic atmosphere, tactile detail',
  ambition: 'internal cost, not hustle',
}

export function parseCinematicIntent(input: {
  topic: string
  tone?: string
  style?: string
  duration?: number
  niche?: string
}): CinematicIntent {
  const topic = input.topic.trim()
  const niche = inferNicheFromBrief({
    topic,
    tone: input.tone,
    style: input.style,
    niche: input.niche,
  })

  const lower = `${topic} ${input.tone ?? ''} ${input.style ?? ''}`.toLowerCase()
  let emotionalCore = 'emotional truth held with cinematic restraint'
  for (const [key, value] of Object.entries(EMOTIONAL_MARKERS)) {
    if (lower.includes(key)) {
      emotionalCore = value
      break
    }
  }

  const wordCount = topic.split(/\s+/).length
  const suggestedDuration =
    input.duration ??
    (wordCount <= 8 ? 30 : wordCount <= 16 ? 45 : 60)

  return {
    topic,
    niche,
    emotionalCore,
    suggestedDuration,
    directingNote: `Direct for ${emotionalCore}; avoid explanation — show feeling.`,
  }
}

export function intentPromptFragment(intent: CinematicIntent): string {
  return [
    'Cinematic intent (invisible to viewer):',
    `- Emotional core: ${intent.emotionalCore}`,
    `- Directing note: ${intent.directingNote}`,
  ].join('\n')
}
