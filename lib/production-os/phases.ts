/**
 * Mugtee Production OS — master cinematic pipeline (max 3 minutes).
 * Phases are the product contract; engines behind them are replaceable.
 */

export const PRODUCTION_OS_MAX_DURATION_SEC = 180

export type ProductionOsPhaseId =
  | 'idea_discovery'
  | 'deep_research'
  | 'creative_direction'
  | 'script'
  | 'screenplay'
  | 'storyboard'
  | 'shot_list'
  | 'voiceover'
  | 'image_generation'
  | 'animation'
  | 'video_editing'
  | 'music'
  | 'sound_design'
  | 'captions'
  | 'rendering'

export type ProductionOsPhaseStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export type ProductionOsEngineStatus = 'integrated' | 'partial' | 'planned'

export type ProductionOsPhaseDefinition = {
  id: ProductionOsPhaseId
  order: number
  title: string
  /** User-facing creative progress line (never technical). */
  progressLine: string
  deliverables: string[]
  engineStatus: ProductionOsEngineStatus
  /** Primary module path(s) that implement this phase today. */
  modules: string[]
}

export const PRODUCTION_OS_PHASES: readonly ProductionOsPhaseDefinition[] = [
  {
    id: 'idea_discovery',
    order: 1,
    title: 'Idea Discovery',
    progressLine: 'Understanding your idea…',
    deliverables: ['Creative Brief'],
    engineStatus: 'integrated',
    modules: [
      'lib/input-understanding/*',
      'lib/content-director/creative-director-brief.ts',
      'lib/cinematic/quick-cut/run-script-generation.ts',
    ],
  },
  {
    id: 'deep_research',
    order: 2,
    title: 'Deep Research',
    progressLine: 'Researching your topic…',
    deliverables: ['Research Report', 'Creative Insights', 'Reference Library'],
    engineStatus: 'partial',
    modules: ['lib/research/*', 'types/deep-research.ts', 'app/api/director/*'],
  },
  {
    id: 'creative_direction',
    order: 3,
    title: 'Creative Direction',
    progressLine: 'Building your story…',
    deliverables: ['Visual Style', 'Colour Palette', 'Mood Board', 'Camera Language'],
    engineStatus: 'integrated',
    modules: [
      'lib/content-director/*',
      'lib/cinematic/visual-bible.ts',
      'lib/pipeline/v3-cinematic-pipeline.ts',
    ],
  },
  {
    id: 'script',
    order: 4,
    title: 'Script',
    progressLine: 'Building your story…',
    deliverables: ['Hook', 'Narration', 'Story Arc', 'CTA', 'Script options'],
    engineStatus: 'integrated',
    modules: ['lib/cinematic/quick-cut/run-script-generation.ts', 'app/api/generate-script'],
  },
  {
    id: 'screenplay',
    order: 5,
    title: 'Screenplay',
    progressLine: 'Casting your characters…',
    deliverables: ['Scene breakdown', 'Action', 'Dialogue', 'Camera direction'],
    engineStatus: 'partial',
    modules: ['lib/cinematic/scene-blueprint.ts', 'app/api/generate-scenes'],
  },
  {
    id: 'storyboard',
    order: 6,
    title: 'Storyboard',
    progressLine: 'Generating storyboard…',
    deliverables: ['Storyboard panels', 'Composition notes', 'Prompts'],
    engineStatus: 'integrated',
    modules: ['lib/cinematic/storyboard-generator.ts', 'lib/cinematic/storyboard-sop-engine.ts'],
  },
  {
    id: 'shot_list',
    order: 7,
    title: 'Shot List',
    progressLine: 'Designing your world…',
    deliverables: ['Shot list', 'Lens', 'Movement', 'Duration'],
    engineStatus: 'partial',
    modules: ['lib/motion/*', 'lib/cinematic/scene-blueprint.ts'],
  },
  {
    id: 'voiceover',
    order: 8,
    title: 'Voiceover',
    progressLine: 'Recording narration…',
    deliverables: ['Narration audio', 'Timing', 'Waveform'],
    engineStatus: 'integrated',
    modules: ['lib/voice/generateVoice.ts', 'app/api/generate-voice'],
  },
  {
    id: 'image_generation',
    order: 9,
    title: 'Image Generation',
    progressLine: 'Designing your world…',
    deliverables: ['Production frames', 'Consistency pack'],
    engineStatus: 'integrated',
    modules: ['lib/cinematic/generate-scene-images.ts', 'lib/image-providers/*'],
  },
  {
    id: 'animation',
    order: 10,
    title: 'Animation',
    progressLine: 'Animating scenes…',
    deliverables: ['Animated scenes', 'Camera motion'],
    engineStatus: 'partial',
    modules: [
      'lib/motion/*',
      'lib/video-providers/*',
      'lib/remotion/*',
      'lib/cinematic/scene-video-pipeline.client.ts',
    ],
  },
  {
    id: 'video_editing',
    order: 11,
    title: 'Video Editing',
    progressLine: 'Editing your film…',
    deliverables: ['Timeline', 'Transitions', 'Titles', 'Colour grade plan'],
    engineStatus: 'partial',
    modules: ['lib/reel/compose-reel-timeline.ts', 'lib/export/*', 'lib/remotion/*'],
  },
  {
    id: 'music',
    order: 12,
    title: 'Music',
    progressLine: 'Composing soundtrack…',
    deliverables: ['Music direction', 'Ducked mix (when audio available)'],
    engineStatus: 'partial',
    modules: ['lib/creative-team/agents/music-director/*'],
  },
  {
    id: 'sound_design',
    order: 13,
    title: 'Sound Design',
    progressLine: 'Composing soundtrack…',
    deliverables: ['Ambience cues', 'SFX plan'],
    engineStatus: 'planned',
    modules: [],
  },
  {
    id: 'captions',
    order: 14,
    title: 'Captions',
    progressLine: 'Editing your film…',
    deliverables: ['Animated captions', 'SRT'],
    engineStatus: 'integrated',
    modules: ['lib/reel/*', 'lib/quick-cut/creator-pack-export.client.ts'],
  },
  {
    id: 'rendering',
    order: 15,
    title: 'Rendering',
    progressLine: 'Rendering final movie…',
    deliverables: ['MP4', 'MOV (when enabled)', 'Export package'],
    engineStatus: 'integrated',
    modules: [
      'lib/video/orchestrate-remotion-reel.ts',
      'lib/export/*',
      'lib/quick-cut/creator-pack-export.client.ts',
    ],
  },
] as const

export const PRODUCTION_OS_PHASE_ORDER = PRODUCTION_OS_PHASES.map((p) => p.id)

export function getProductionOsPhase(
  id: ProductionOsPhaseId
): ProductionOsPhaseDefinition | undefined {
  return PRODUCTION_OS_PHASES.find((phase) => phase.id === id)
}

/** Clamp requested duration to Production OS maximum (3 minutes). */
export function clampProductionOsDurationSec(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 60
  return Math.min(PRODUCTION_OS_MAX_DURATION_SEC, Math.max(15, Math.round(seconds)))
}
