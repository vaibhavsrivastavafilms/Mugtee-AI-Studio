/**
 * Mugtee Production OS V4 — Master Production Pipeline (AI Creative Companion).
 * Max runtime: 180 seconds. Creator never sees models, APIs, or providers.
 */

export const PRODUCTION_OS_V4 = 'v4' as const
export const PRODUCTION_OS_V4_MAX_DURATION_SEC = 180

export type ProductionOsV4PhaseId =
  | 'idea_discovery'
  | 'deep_research'
  | 'creative_direction'
  | 'script'
  | 'screenplay'
  | 'storyboard'
  | 'shot_list'
  | 'character_bible'
  | 'environment_bible'
  | 'voice'
  | 'image_generation'
  | 'animation'
  | 'video_editing'
  | 'music'
  | 'sound_design'
  | 'captions'
  | 'rendering'
  | 'quality_check'
  | 'export'

export type ProductionOsV4PhaseDefinition = {
  id: ProductionOsV4PhaseId
  order: number
  title: string
  /** Companion-facing line (Thinking Engine) — never technical. */
  thinking: string
  deliverables: string[]
}

export const PRODUCTION_OS_V4_PHASES: readonly ProductionOsV4PhaseDefinition[] = [
  {
    id: 'idea_discovery',
    order: 1,
    title: 'Idea Discovery',
    thinking: '✨ Understanding your idea…',
    deliverables: ['Creative Brief'],
  },
  {
    id: 'deep_research',
    order: 2,
    title: 'Deep Research',
    thinking: '🔍 Researching your topic…',
    deliverables: ['Research Report', 'Reference Library'],
  },
  {
    id: 'creative_direction',
    order: 3,
    title: 'Creative Direction',
    thinking: '🧠 Building your creative direction…',
    deliverables: [
      'Mood',
      'Lighting',
      'Colour Palette',
      'Lens Style',
      'Animation Style',
      'Typography',
    ],
  },
  {
    id: 'script',
    order: 4,
    title: 'Script',
    thinking: '🧠 Building your screenplay…',
    deliverables: ['Hook', 'Story', 'Narration', 'CTA', 'Variations'],
  },
  {
    id: 'screenplay',
    order: 5,
    title: 'Screenplay',
    thinking: '🧠 Building your screenplay…',
    deliverables: ['Scene breakdown', 'Action', 'Dialogue', 'Camera Direction'],
  },
  {
    id: 'storyboard',
    order: 6,
    title: 'Storyboard',
    thinking: '🖼 Generating storyboard…',
    deliverables: ['Panels', 'Composition', 'Reference prompts'],
  },
  {
    id: 'shot_list',
    order: 7,
    title: 'Shot List',
    thinking: '🎬 Directing scenes…',
    deliverables: ['Lens', 'Movement', 'Duration', 'Transitions'],
  },
  {
    id: 'character_bible',
    order: 8,
    title: 'Character Bible',
    thinking: '🎭 Casting characters…',
    deliverables: ['Face', 'Hair', 'Outfit', 'Expressions', 'Reference Images'],
  },
  {
    id: 'environment_bible',
    order: 9,
    title: 'Environment Bible',
    thinking: '🎨 Designing your world…',
    deliverables: ['Lighting', 'Architecture', 'Weather', 'Props', 'Mood'],
  },
  {
    id: 'voice',
    order: 10,
    title: 'Voice Generation',
    thinking: '🎙 Recording narration…',
    deliverables: ['Voiceover', 'Timing'],
  },
  {
    id: 'image_generation',
    order: 11,
    title: 'Image Generation',
    thinking: '🎨 Designing your world…',
    deliverables: ['Production frames'],
  },
  {
    id: 'animation',
    order: 12,
    title: 'Animation',
    thinking: '🎥 Animating performances…',
    deliverables: ['Animated scenes', 'Camera motion'],
  },
  {
    id: 'video_editing',
    order: 13,
    title: 'Video Editing',
    thinking: '🎞 Editing your movie…',
    deliverables: ['Timeline', 'Transitions', 'Colour grade', 'Audio mix'],
  },
  {
    id: 'music',
    order: 14,
    title: 'Music',
    thinking: '🎵 Composing soundtrack…',
    deliverables: ['Score', 'Ducked mix'],
  },
  {
    id: 'sound_design',
    order: 15,
    title: 'Sound Design',
    thinking: '🎵 Composing soundtrack…',
    deliverables: ['Ambience', 'Impacts', 'Transitions'],
  },
  {
    id: 'captions',
    order: 16,
    title: 'Captions',
    thinking: '🎞 Editing your movie…',
    deliverables: ['Animated captions', 'SRT'],
  },
  {
    id: 'rendering',
    order: 17,
    title: 'Rendering',
    thinking: '📦 Rendering final export…',
    deliverables: ['MP4', 'MOV', 'Thumbnail', 'Poster'],
  },
  {
    id: 'quality_check',
    order: 18,
    title: 'Quality Check',
    thinking: '✨ Polishing your film…',
    deliverables: ['Quality report'],
  },
  {
    id: 'export',
    order: 19,
    title: 'Export',
    thinking: '🎉 Your movie is ready.',
    deliverables: ['Creator Pack', 'Project archive'],
  },
] as const

export const PRODUCTION_OS_V4_PHASE_ORDER = PRODUCTION_OS_V4_PHASES.map((p) => p.id)

export function getV4Phase(id: ProductionOsV4PhaseId): ProductionOsV4PhaseDefinition {
  const phase = PRODUCTION_OS_V4_PHASES.find((p) => p.id === id)
  if (!phase) throw new Error(`Unknown V4 phase: ${id}`)
  return phase
}

export function clampV4DurationSec(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 60
  return Math.min(PRODUCTION_OS_V4_MAX_DURATION_SEC, Math.max(15, Math.round(seconds)))
}
