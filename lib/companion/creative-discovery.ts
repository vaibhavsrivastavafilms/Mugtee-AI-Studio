import type { CreativeBrief, DiscoveryStepId } from '@/lib/companion/types'
import { DISCOVERY_STEP_ORDER } from '@/lib/companion/types'
import { companionCopy } from '@/lib/companion/microcopy'

export type DiscoveryQuestion = {
  id: DiscoveryStepId
  mugteePrompt: string
  placeholder: string
  chips?: string[]
}

export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  {
    id: 'theme',
    mugteePrompt: 'What\'s the heart of this story? One line — the idea you\'d tell a friend.',
    placeholder: 'e.g. A forgotten temple that still collects prayers…',
    chips: ['Hidden history', 'Underdog comeback', 'Mystery reveal', 'Emotional truth'],
  },
  {
    id: 'emotion',
    mugteePrompt: 'What should viewers feel in their chest by the end?',
    placeholder: 'e.g. Awe, then quiet guilt…',
    chips: ['Wonder', 'Tension', 'Hope', 'Melancholy', 'Triumph'],
  },
  {
    id: 'audience_reaction',
    mugteePrompt: 'When they scroll past — what do you want them to do or think?',
    placeholder: 'e.g. Save it. Share with one person. Feel seen.',
    chips: ['Share immediately', 'Comment their story', 'Save for later', 'Rewatch the hook'],
  },
  {
    id: 'protagonist',
    mugteePrompt: 'Who carries this story — even if it\'s you, the viewer, or an idea?',
    placeholder: 'e.g. A lone archivist. The algorithm. Every middle-class dream.',
    chips: ['Anonymous narrator', 'Historical figure', 'The viewer', 'An object or place'],
  },
  {
    id: 'takeaway',
    mugteePrompt: 'One sentence they should remember tomorrow morning.',
    placeholder: 'e.g. Some doors stay closed for a reason.',
    chips: ['One sharp lesson', 'An open question', 'A call to act', 'A feeling, not a fact'],
  },
]

export function discoveryStepIndex(step: DiscoveryStepId): number {
  return DISCOVERY_STEP_ORDER.indexOf(step)
}

export function nextDiscoveryStep(current: DiscoveryStepId): DiscoveryStepId | null {
  const idx = discoveryStepIndex(current)
  if (idx < 0 || idx >= DISCOVERY_STEP_ORDER.length - 1) return null
  return DISCOVERY_STEP_ORDER[idx + 1]
}

export function isDiscoveryComplete(brief: CreativeBrief): boolean {
  return DISCOVERY_STEP_ORDER.every((key) => {
    const val = brief[key === 'audience_reaction' ? 'audienceReaction' : key]
    return typeof val === 'string' && val.trim().length >= 2
  })
}

export function normalizeCreativeBrief(raw: unknown): CreativeBrief {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const str = (key: string, max = 500) => {
    const v = o[key]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
  }
  return {
    theme: str('theme'),
    emotion: str('emotion'),
    audienceReaction: str('audienceReaction') ?? str('audience_reaction'),
    protagonist: str('protagonist'),
    tone: str('tone'),
    takeaway: str('takeaway'),
    completedAt:
      typeof o.completedAt === 'string' ? o.completedAt : undefined,
  }
}

export function applyDiscoveryAnswer(
  brief: CreativeBrief,
  step: DiscoveryStepId,
  answer: string
): CreativeBrief {
  const trimmed = answer.trim().slice(0, 500)
  const next = { ...brief }
  switch (step) {
    case 'theme':
      next.theme = trimmed
      break
    case 'emotion':
      next.emotion = trimmed
      break
    case 'audience_reaction':
      next.audienceReaction = trimmed
      break
    case 'protagonist':
      next.protagonist = trimmed
      break
    case 'takeaway':
      next.takeaway = trimmed
      break
  }
  if (isDiscoveryComplete(next)) {
    next.completedAt = new Date().toISOString()
  }
  return next
}

export function discoveryFlowTitle(): string {
  return companionCopy('discoveryTitle')
}

export function discoveryFlowSubtitle(): string {
  return companionCopy('discoverySubtitle')
}

/** Prompt section for script/storyboard generation */
export function buildCreativeBriefPromptSection(brief?: CreativeBrief | null): string {
  if (!brief) return ''
  const lines = [
    brief.theme ? `Theme: ${brief.theme}` : '',
    brief.emotion ? `Target emotion: ${brief.emotion}` : '',
    brief.audienceReaction ? `Desired audience reaction: ${brief.audienceReaction}` : '',
    brief.protagonist ? `Story carrier / protagonist: ${brief.protagonist}` : '',
    brief.tone ? `Tone: ${brief.tone}` : '',
    brief.takeaway ? `Takeaway line: ${brief.takeaway}` : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return ['CREATIVE BRIEF (honor throughout script and visuals):', ...lines].join('\n')
}

export function mergeBriefWithConversation(
  brief: CreativeBrief,
  opts: { topic?: string; tone?: string }
): CreativeBrief {
  return {
    ...brief,
    theme: brief.theme ?? opts.topic?.trim(),
    tone: brief.tone ?? opts.tone,
  }
}
