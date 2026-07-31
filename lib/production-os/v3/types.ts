/**
 * Mugtee Production OS V3 — true job-based cinematic pipeline.
 * Progress / ETA / activity come only from worker state — never simulated.
 */

export const PRODUCTION_OS_V3 = 'v3' as const

export type ProductionJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled'

export type ProductionOsV3PhaseId =
  | 'idea'
  | 'research'
  | 'creative_direction'
  | 'script'
  | 'screenplay'
  | 'storyboard'
  | 'shot_list'
  | 'voice'
  | 'characters'
  | 'environment'
  | 'image_generation'
  | 'animation'
  | 'video_editing'
  | 'music'
  | 'sound_design'
  | 'captions'
  | 'rendering'
  | 'quality_check'
  | 'export'

export const PRODUCTION_OS_V3_PHASE_ORDER: readonly ProductionOsV3PhaseId[] = [
  'idea',
  'research',
  'creative_direction',
  'script',
  'screenplay',
  'storyboard',
  'shot_list',
  'voice',
  'characters',
  'environment',
  'image_generation',
  'animation',
  'video_editing',
  'music',
  'sound_design',
  'captions',
  'rendering',
  'quality_check',
  'export',
] as const

export type ProductionWorkerReport = {
  jobId: string
  phase: ProductionOsV3PhaseId
  sceneId?: string
  status: ProductionJobStatus
  /** 0–100 within this worker only */
  progress: number
  durationMs?: number
  errors?: string[]
  output?: Record<string, unknown>
  /** Frame counters for render workers */
  framesRendered?: number
  framesTotal?: number
  fps?: number
  speed?: string
  message: string
  at: number
}

export type SceneProductionUnit = {
  id: string
  index: number
  story: string
  script: string
  storyboardPrompt: string
  characters: string[]
  environment: string
  voiceUrl: string | null
  musicCue: string | null
  imageUrl: string | null
  videoUrl: string | null
  animationPreset: string | null
  transition: string | null
  durationSec: number
  status: ProductionJobStatus
  camera: {
    lens: string
    movement: string
    composition: string
    focus: string
    depth: string
  } | null
  checkpoint: {
    image: boolean
    voice: boolean
    animation: boolean
    render: boolean
  }
  errors: string[]
  updatedAt: number
}

export type CharacterReference = {
  id: string
  name: string
  face: string
  hair: string
  clothes: string
  expressionDefault: string
  lighting: string
  colours: string[]
  identityLock: string
  referenceImageUrl?: string | null
}

export type EnvironmentProfile = {
  id: string
  name: string
  lighting: string
  weather: string
  architecture: string
  objects: string[]
  colourPalette: string[]
  mood: string
  referenceImageUrl?: string | null
}

export type ProductionOsV3Checkpoint = {
  version: typeof PRODUCTION_OS_V3
  projectId: string
  phase: ProductionOsV3PhaseId
  sceneIndex: number
  completedPhases: ProductionOsV3PhaseId[]
  scenes: Array<Pick<SceneProductionUnit, 'id' | 'status' | 'checkpoint' | 'imageUrl' | 'videoUrl'>>
  characterRef: CharacterReference | null
  environmentRef: EnvironmentProfile | null
  updatedAt: number
}

export type ProductionOsV3ProgressSnapshot = {
  overallPercent: number
  phase: ProductionOsV3PhaseId | null
  phaseLabel: string
  /** e.g. "18 / 24" */
  imagesLabel: string | null
  animationLabel: string | null
  framesLabel: string | null
  renderPercent: number | null
  etaSeconds: number
  etaLabel: string
  activity: string[]
  isComplete: boolean
}

export type ExportArtifactId =
  | 'mp4'
  | 'mov'
  | 'thumbnail'
  | 'poster'
  | 'storyboard_pdf'
  | 'screenplay_pdf'
  | 'creative_brief'
  | 'research_report'
  | 'creator_pack'

export type ExportArtifact = {
  id: ExportArtifactId
  pathOrUrl: string | null
  verified: boolean
  bytes?: number
  error?: string
}
