/** Generation quality tier — controls provider routing and unit economics. */

export type GenerationMode = 'draft' | 'creator' | 'cinematic'

export const GENERATION_MODES: GenerationMode[] = ['draft', 'creator', 'cinematic']

export const GENERATION_MODE_LABELS: Record<GenerationMode, string> = {
  draft: 'Draft (Fast & Cheap)',
  creator: 'Creator (Recommended)',
  cinematic: 'Cinematic Studio',
}

export const GENERATION_MODE_DESCRIPTIONS: Record<GenerationMode, string> = {
  draft: 'Pollinations / Together images, OpenAI TTS, no web research.',
  creator: 'GPT Image 1, OpenAI TTS, cached research — best default.',
  cinematic: 'ElevenLabs voice, live research, optional Runway clips (credits).',
}

export function normalizeGenerationMode(raw: unknown): GenerationMode {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (v === 'draft' || v === 'creator' || v === 'cinematic') return v
  return 'creator'
}

/** Quick Cut default — never cinematic unless user opts in. */
export const DEFAULT_GENERATION_MODE: GenerationMode = 'creator'
