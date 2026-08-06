/** Mugtee V3 — structured contracts between agents (JSON only, no NL handoffs). */

export const V3_AGENT_IDS = [
  'planner',
  'research',
  'script',
  'storyboard',
  'character',
  'location',
  'style',
  'prompts',
  'image',
  'video',
  'voice',
  'music',
  'captions',
  'editor',
  'quality',
  'export',
] as const

export type V3AgentId = (typeof V3_AGENT_IDS)[number]

export type V3JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export type V3ProjectStatus =
  | 'draft'
  | 'planning'
  | 'producing'
  | 'completed'
  | 'failed'

export type V3Platform =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube Shorts'
  | 'YouTube'
  | 'LinkedIn'
  | 'Facebook'

export type V3AspectRatio = '9:16' | '16:9' | '1:1' | '4:5'

/** Planner output — every downstream agent reads this document. */
export type ProductionPlan = {
  title: string
  duration: number
  platform: V3Platform
  language: string
  aspectRatio: V3AspectRatio
  style: string
  sceneCount: number
  voice: string
  music: string
  characterConsistency: boolean
  tone?: string
  pacing?: string
  targetAudience?: string
  brand?: string
  location?: string
  callToAction?: string
}

export type V3TimelineStageStatus = 'pending' | 'running' | 'completed' | 'failed'

export type V3TimelineStage = {
  id: string
  agent: V3AgentId | 'understanding'
  label: string
  status: V3TimelineStageStatus
  error?: string | null
}

export type V3ProjectRow = {
  id: string
  user_id: string
  title: string
  prompt: string
  status: V3ProjectStatus
  production_plan: ProductionPlan | null
  cinematic_style: CinematicStyle | null
  current_stage: string | null
  voice_url: string | null
  music_url: string | null
  captions_json: Record<string, unknown>[] | unknown
  timeline_json: Record<string, unknown> | null
  reel_url: string | null
  export_status: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export type V3JobRow = {
  id: string
  project_id: string
  agent: V3AgentId
  status: V3JobStatus
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type V3SceneRow = {
  id: string
  project_id: string
  number: number
  script: ScriptScene | Record<string, unknown>
  storyboard: StoryboardScene | Record<string, unknown>
  duration: number | null
  location_id: string | null
  character_ids: string[]
  created_at: string
}

/** Script Agent output — one scene in the screenplay. */
export type ScriptScene = {
  number: number
  title: string
  narration: string
  dialogue: string
  duration: number
  emotion: string
  transition: string
}

export type ScriptDocument = {
  scenes: ScriptScene[]
}

/** Storyboard Agent output — shots per scene. */
export type StoryboardShot = {
  cameraAngle: string
  framing: string
  movement: string
  lens: string
  lighting: string
  location: string
  duration: number
}

export type StoryboardScene = {
  number: number
  shots: StoryboardShot[]
}

export type StoryboardDocument = {
  scenes: StoryboardScene[]
}

export type ResearchBrief = {
  topics: string[]
  culturalNotes: string[]
  visualReferences: string[]
  storytellingReferences: string[]
  emotionalDirection: string[]
  keyFacts: string[]
}

/** Character Agent output — reusable character identity. */
export type CharacterProfile = {
  characterId: string
  name: string
  age: string
  appearance: string
  clothing: string
  hairstyle: string
  accessories: string[]
  facialFeatures: string
  seed: string
  role: string
  sceneNumbers: number[]
}

export type CharacterDocument = {
  characters: CharacterProfile[]
}

export type V3CharacterRow = {
  id: string
  project_id: string
  name: string
  appearance_json: CharacterProfile | Record<string, unknown>
  seed: string | null
  reference_image: string | null
  created_at: string
}

/** Location Agent output — reusable production locations. */
export type LocationProfile = {
  locationId: string
  name: string
  lighting: string
  mood: string
  architecture: string
  weather: string
  environment: string
  cameraRestrictions: string
  sceneNumbers: number[]
}

export type LocationDocument = {
  locations: LocationProfile[]
}

export type V3LocationRow = {
  id: string
  project_id: string
  location_key: string
  name: string
  profile: LocationProfile | Record<string, unknown>
  created_at: string
}

/** Style Agent output — project-wide cinematic identity. */
export type CinematicStyle = {
  cameraSystem: string
  lens: string
  lightingStyle: string
  colorGrading: string
  motionStyle: string
  filmStock: string
  composition: string
}

/** Prompt Engineering — metadata stored per scene prompt row. */
export type PromptMetadata = {
  camera: string
  lens: string
  lighting: string
  movement: string
  quality: string
  style: string
  aspectRatio: V3AspectRatio
  characterSeed?: string
  characterAppearance?: string
  location?: string
  consistencyReferences?: string[]
}

/** Prompt Engineering Agent output — one object per scene. */
export type ScenePrompt = {
  sceneId: string
  sceneNumber: number
  imagePrompt: string
  videoPrompt: string
  negativePrompt: string
  metadata: PromptMetadata
}

export type ScenePromptDocument = {
  prompts: ScenePrompt[]
}

export type V3ScenePromptRow = {
  id: string
  project_id: string
  scene_id: string
  image_prompt: string
  video_prompt: string
  negative_prompt: string
  prompt_version: number
  metadata: PromptMetadata | Record<string, unknown>
  created_at: string
  updated_at: string
}

export type V3SceneImageStatus =
  | 'pending'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type V3SceneImageMetadata = {
  provider: string
  model?: string
  quality?: string
  style?: string
  camera?: string
  seed?: number
  location?: string
  aspectRatio?: V3AspectRatio
  characterSeed?: string
  promptVersion?: number
  attempt?: number
  error?: string
  providerResponse?: Record<string, unknown>
}

export type V3SceneImageRow = {
  id: string
  project_id: string
  scene_id: string
  prompt_id: string | null
  provider: string
  provider_job_id: string | null
  image_url: string | null
  thumbnail_url: string | null
  seed: number | null
  width: number | null
  height: number | null
  generation_time_ms: number | null
  status: V3SceneImageStatus
  metadata: V3SceneImageMetadata | Record<string, unknown>
  created_at: string
  updated_at: string
}

export type V3SceneVideoStatus =
  | 'pending'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type V3SceneVideoMetadata = {
  provider: string
  model?: string
  cameraMovement?: string
  aspectRatio?: V3AspectRatio
  duration?: number
  fps?: number
  location?: string
  style?: string
  promptVersion?: number
  attempt?: number
  error?: string
  providerResponse?: Record<string, unknown>
  sceneNumber?: number
  imageId?: string
}

export type V3SceneVideoRow = {
  id: string
  project_id: string
  scene_id: string
  image_id: string | null
  provider: string
  provider_job_id: string | null
  video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  fps: number | null
  resolution: string | null
  generation_time_ms: number | null
  status: V3SceneVideoStatus
  retry_count: number
  metadata: V3SceneVideoMetadata | Record<string, unknown>
  created_at: string
  updated_at: string
}

export type V3ProjectSnapshot = {
  project: V3ProjectRow
  jobs: V3JobRow[]
  scenes: V3SceneRow[]
  characters: V3CharacterRow[]
  locations: V3LocationRow[]
  scenePrompts: V3ScenePromptRow[]
  sceneImages: V3SceneImageRow[]
  sceneVideos: V3SceneVideoRow[]
  timeline: V3TimelineStage[]
}
