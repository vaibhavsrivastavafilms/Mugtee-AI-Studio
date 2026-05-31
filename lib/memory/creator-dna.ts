import type { CreatorDna, MemoryProfile } from '@/lib/memory/types'
import { normalizeCreatorDna } from '@/lib/memory/creator-memory-engine'

export type DnaHeuristicInput = {
  niche?: string
  platform?: string
  tone?: string
  visualStyle?: string
  theme?: string
  hook?: string
  format?: string
  audience?: string
  contentStyle?: string
  experienceLevel?: string
}

const EMOTIONAL_TRIGGERS = [
  'transformation',
  'curiosity',
  'urgency',
  'belonging',
  'surprise',
  'nostalgia',
  'authority',
  'empathy',
]

function inferEmotionalTrigger(input: DnaHeuristicInput): string | undefined {
  const text = [input.theme, input.hook, input.tone].filter(Boolean).join(' ').toLowerCase()
  if (!text) return undefined
  for (const trigger of EMOTIONAL_TRIGGERS) {
    if (text.includes(trigger)) return trigger
  }
  if (text.includes('before') && text.includes('after')) return 'transformation'
  if (text.includes('secret') || text.includes('nobody')) return 'curiosity'
  if (text.includes('you') || text.includes('your')) return 'empathy'
  return undefined
}

function inferCreatorType(input: DnaHeuristicInput): string | undefined {
  if (input.experienceLevel === 'beginner') return 'emerging_creator'
  if (input.experienceLevel === 'advanced') return 'veteran_creator'
  const style = (input.contentStyle ?? input.tone ?? '').toLowerCase()
  if (style.includes('edu') || style.includes('teach')) return 'educator'
  if (style.includes('story') || style.includes('cinematic')) return 'storyteller'
  if (style.includes('entertain')) return 'entertainer'
  return input.niche ? `${input.niche}_creator` : undefined
}

function inferFormat(input: DnaHeuristicInput): string | undefined {
  if (input.format) return input.format
  const platform = (input.platform ?? '').toLowerCase()
  if (platform.includes('youtube')) return 'long_form_shorts'
  if (platform.includes('instagram') || platform.includes('reels')) return 'reels'
  if (platform.includes('tiktok')) return 'short_form'
  return 'quick_cut'
}

/** Build or update DNA profile from project + profile heuristics */
export function buildCreatorDna(
  existing: CreatorDna | unknown,
  input: DnaHeuristicInput
): CreatorDna {
  const base = normalizeCreatorDna(existing)
  return {
    creatorType: base.creatorType ?? inferCreatorType(input),
    audience: input.audience ?? base.audience,
    format: base.format ?? inferFormat(input),
    emotionalTrigger:
      inferEmotionalTrigger(input) ?? base.emotionalTrigger,
    voice: input.tone ?? base.voice,
    visualStyle: input.visualStyle ?? base.visualStyle,
    updatedAt: new Date().toISOString(),
  }
}

/** Merge DNA updates from a completed memory profile context */
export function updateDnaFromProfile(
  profile: MemoryProfile,
  input: DnaHeuristicInput
): CreatorDna {
  return buildCreatorDna(profile.creatorDna, {
    ...input,
    tone: input.tone ?? profile.creatorMemory.preferredTone,
    visualStyle: input.visualStyle ?? profile.creatorMemory.preferredVisualStyle,
    niche: input.niche ?? profile.preferences.niche,
    platform: input.platform ?? profile.preferences.platform,
  })
}
