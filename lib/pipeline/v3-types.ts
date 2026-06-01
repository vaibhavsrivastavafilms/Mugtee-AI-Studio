import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { ReelTimeline } from '@/lib/reel/types'
import type { VoiceDirectorPlan } from '@/lib/voice/voiceDirector'
import type { ContentBrief } from '@/lib/content-director/content-brief'

/** V3 pipeline stage identifiers — maps to production flow. */
export type V3PipelineStageId =
  | 'creative_director'
  | 'scene_planner'
  | 'visual_bible'
  | 'flux_image_engine'
  | 'seedance_motion'
  | 'voice_director'
  | 'timeline_composer'
  | 'creator_editor'
  | 'memory_system'
  | 'export_studio'

export type V3StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type V3StageResult<T = unknown> = {
  stage: V3PipelineStageId
  status: V3StageStatus
  output?: T
  error?: string
  durationMs?: number
  source?: 'rules' | 'ai' | 'existing' | 'mock'
}

/** Stage 1 — Creative Director output (unique every run). */
export type CreativeDirectorBrief = {
  runId: string
  hook: string
  title: string
  narrativeAngle: string
  audience: string
  emotionalTone: string
  retentionStrategy: string
  visualStyle: string
  pacingStyle: string
  /** Underlying content brief — backward compatible with ContentBrief consumers */
  contentBrief: ContentBrief
  uniquenessToken: string
}

/** Stage 2 — Scene plan beat. */
export type ScenePlanEntry = {
  sceneId: string
  index: number
  duration: number
  visualGoal: string
  cameraStyle: string
  transitionType: string
  narration: string
  emotion?: string
}

export type ScenePlan = {
  scenes: ScenePlanEntry[]
  totalDurationSec: number
  pacingStyle: string
}

/** Stage 3 — Visual Bible for global consistency. */
export type VisualBible = {
  artStyle: string
  colorPalette: string
  lensType: string
  lighting: string
  cameraMovement: string
  character: string
  environment: string
  mood: string
  consistencyPack: {
    characterReference: string
    environmentReference: string
    visualStyleReference: string
  }
}

/** Stage 4 — Flux Kontext image prompt per scene. */
export type FluxScenePrompt = {
  sceneId: string
  prompt: string
  negativePrompt?: string
  aspectRatio: '9:16' | '16:9' | '1:1'
  seed?: number
  kontextNotes?: string
}

/** Stage 5 — Seedance / motion instructions. */
export type MotionInstructions = {
  sceneId: string
  cameraMotion: string
  subjectMotion: string
  atmosphereMotion: string
  prompt: string
  durationSec: number
  motionPresetId?: string
}

/** Stage 6 — Voice direction (wraps existing VoiceDirectorPlan). */
export type VoiceDirection = VoiceDirectorPlan & {
  stage: 'voice_director'
}

/** Stage 7 — Extended timeline tracks. */
export type TimelineTrackKind =
  | 'video'
  | 'voice'
  | 'music'
  | 'captions'
  | 'effects'
  | 'transitions'

export type TimelineTrackClip = {
  id: string
  sceneId?: string
  startSec: number
  endSec: number
  label?: string
  assetUrl?: string | null
  metadata?: Record<string, unknown>
}

export type TimelineTrack = {
  kind: TimelineTrackKind
  clips: TimelineTrackClip[]
  muted?: boolean
}

export type TimelineTracks = {
  version: 1
  reelTimeline: ReelTimeline | null
  tracks: TimelineTrack[]
  composedAt: string
}

/** Stage 9 — Creator memory extensions for V3. */
export type V3CreatorMemory = {
  creatorStyle?: string
  preferredHooks?: string[]
  niche?: string
  pacing?: string
  visualStyle?: string
  updatedAt?: string
}

/** Full V3 pipeline state snapshot. */
export type V3PipelineState = {
  enabled: boolean
  currentStage: V3PipelineStageId | null
  completedStages: V3PipelineStageId[]
  creativeDirectorBrief: CreativeDirectorBrief | null
  scenePlan: ScenePlan | null
  visualBible: VisualBible | null
  fluxPrompts: FluxScenePrompt[]
  motionInstructions: MotionInstructions[]
  voiceDirection: VoiceDirection | null
  timelineTracks: TimelineTracks | null
  creatorMemory: V3CreatorMemory | null
  startedAt?: string
  completedAt?: string
}

/** Input context shared across V3 stages. */
export type V3PipelineContext = {
  prompt: string
  topic: string
  duration: number
  niche?: string
  tone?: string
  language?: string
  directorMode?: string
  /** Existing generated assets — integrate, don't rebuild */
  title?: string
  hook?: string
  script?: string
  scenes?: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  contentBrief?: ContentBrief | null
  storyBible?: import('@/lib/cinematic/story-bible').StoryBible | null
  visualStyle?: import('@/lib/cinematic/workflow-state').VisualStyle | null
  voiceUrl?: string | null
  reelTimeline?: ReelTimeline | null
  creativeDirectorBrief?: CreativeDirectorBrief | null
  visualBible?: VisualBible | null
  /** Avoid template reuse */
  sessionSeed?: string
  previousHooks?: string[]
  creatorMemory?: V3CreatorMemory | null
}

export type V3StageOutputMap = {
  creative_director: CreativeDirectorBrief
  scene_planner: ScenePlan
  visual_bible: VisualBible
  flux_image_engine: FluxScenePrompt[]
  seedance_motion: MotionInstructions[]
  voice_director: VoiceDirection
  timeline_composer: TimelineTracks
  creator_editor: { sceneOrder: string[] }
  memory_system: V3CreatorMemory
  export_studio: { formats: string[]; ready: boolean }
}

export const V3_STAGE_ORDER: V3PipelineStageId[] = [
  'creative_director',
  'scene_planner',
  'visual_bible',
  'flux_image_engine',
  'seedance_motion',
  'voice_director',
  'timeline_composer',
  'creator_editor',
  'memory_system',
  'export_studio',
]

export const EMPTY_V3_PIPELINE_STATE: V3PipelineState = {
  enabled: false,
  currentStage: null,
  completedStages: [],
  creativeDirectorBrief: null,
  scenePlan: null,
  visualBible: null,
  fluxPrompts: [],
  motionInstructions: [],
  voiceDirection: null,
  timelineTracks: null,
  creatorMemory: null,
}
