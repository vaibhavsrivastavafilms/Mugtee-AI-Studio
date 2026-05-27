import type { CinematicNiche } from '@/lib/cinematic/niches'

const VOICE_STYLE_IDS = [
  'warm_documentary',
  'emotional_cinematic',
  'deep_trailer',
  'calm_storyteller',
] as const

export type VoiceStyleId = (typeof VOICE_STYLE_IDS)[number]

const NICHE_VOICE: Record<CinematicNiche, VoiceStyleId> = {
  luxury: 'deep_trailer',
  documentary: 'calm_storyteller',
  psychology: 'calm_storyteller',
  spirituality: 'calm_storyteller',
  storytelling: 'warm_documentary',
  motivation: 'emotional_cinematic',
  fitness: 'emotional_cinematic',
  finance: 'deep_trailer',
  'faceless reels': 'emotional_cinematic',
}

const TONE_VOICE: Record<string, VoiceStyleId> = {
  cinematic: 'warm_documentary',
  emotional: 'warm_documentary',
  documentary: 'calm_storyteller',
  motivational: 'emotional_cinematic',
  funny: 'emotional_cinematic',
}

export function recommendVoiceStyle(input: {
  niche: CinematicNiche
  tone?: string
  modelSuggestion?: string
}): VoiceStyleId {
  const fromModel = coerceVoiceStyle(input.modelSuggestion)
  const nicheDefault = NICHE_VOICE[input.niche]
  const toneDefault = TONE_VOICE[String(input.tone ?? '').toLowerCase()]

  // Niche lock wins over generic model pick when model drifted.
  if (input.modelSuggestion && fromModel === nicheDefault) return fromModel
  if (toneDefault && input.niche === 'storytelling') return toneDefault
  return nicheDefault
}

export function coerceVoiceStyle(raw: unknown): VoiceStyleId {
  if (typeof raw !== 'string') return 'warm_documentary'
  const normalized = raw.trim().toLowerCase()
  if (VOICE_STYLE_IDS.includes(normalized as VoiceStyleId)) {
    return normalized as VoiceStyleId
  }
  if (/deep|trailer|luxury|finance/.test(normalized)) return 'deep_trailer'
  if (/calm|documentary|psychology|spiritual/.test(normalized)) return 'calm_storyteller'
  if (/emotion|energetic|faceless|motiv/.test(normalized)) return 'emotional_cinematic'
  if (/warm|story/.test(normalized)) return 'warm_documentary'
  return 'warm_documentary'
}

export const VOICE_LABELS: Record<VoiceStyleId, string> = {
  warm_documentary: 'Warm',
  emotional_cinematic: 'Emotional',
  deep_trailer: 'Deep',
  calm_storyteller: 'Calm',
}

export function voiceStyleLabel(styleId: string): string {
  return VOICE_LABELS[coerceVoiceStyle(styleId)] || 'Warm'
}
