/** Mugtee V7 — autonomous production operating system contracts. */

export const V7_STAGE_IDS = [
  'idea',
  'research',
  'creative',
  'script',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'voice',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
] as const

export type V7StageId = (typeof V7_STAGE_IDS)[number]

export type V7StageStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked'

export type V7ProductionStatus =
  | 'draft'
  | 'planning'
  | 'producing'
  | 'completed'
  | 'failed'

export type V7Platform =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube Shorts'
  | 'YouTube'
  | 'LinkedIn'
  | 'Facebook'

export type V7AspectRatio = '9:16' | '16:9' | '1:1' | '4:5'

/** Idea Analyzer output — creative brief for the entire production. */
export type V7CreativeBrief = {
  title: string
  duration: number
  platform: V7Platform
  language: string
  aspectRatio: V7AspectRatio
  genre: string
  style: string
  sceneCount: number
  voiceDirection: string
  musicDirection: string
  emotion: string
  audience: string
  callToAction?: string
  brand?: string
  location?: string
  characterConsistency: boolean
}

export type V7TimelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked'

export type V7TimelineStage = {
  id: V7StageId
  label: string
  emoji: string
  status: V7TimelineStageStatus
  error?: string | null
}

export type V7ProductionRow = {
  id: string
  user_id: string
  title: string
  prompt: string
  status: V7ProductionStatus
  creative_brief: V7CreativeBrief | null
  current_stage: V7StageId | null
  reel_url: string | null
  mov_url: string | null
  thumbnail_url: string | null
  creator_pack_url: string | null
  export_status: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed'
  timeline_json: Record<string, unknown> | null
  voice_url: string | null
  music_url: string | null
  created_at: string
  updated_at: string
}

export type V7StageRow = {
  id: string
  production_id: string
  stage: V7StageId
  status: V7StageStatus
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type V7SceneRow = {
  id: string
  production_id: string
  number: number
  script: Record<string, unknown>
  storyboard: Record<string, unknown>
  duration: number | null
  created_at: string
}

export type V7ProductionSnapshot = {
  production: V7ProductionRow
  stages: V7StageRow[]
  scenes: V7SceneRow[]
  timeline: V7TimelineStage[]
  pipeline_blocked?: boolean
  block_reason?: string | null
}

/** Result of `advanceV7Production()` — always includes explicit pipeline lock state. */
export type V7AdvanceSnapshot = {
  production: V7ProductionRow
  stages: V7StageRow[]
  scenes: V7SceneRow[]
  timeline: V7TimelineStage[]
  pipeline_blocked: boolean
  block_reason?: string
}

/** User-facing stage labels — never expose provider or prompt details. */
export const V7_STAGE_LABELS: Record<V7StageId, { label: string; emoji: string }> = {
  idea: { label: 'Understanding your idea', emoji: '✨' },
  research: { label: 'Researching', emoji: '🔍' },
  creative: { label: 'Creative direction', emoji: '🎬' },
  script: { label: 'Writing screenplay', emoji: '🧠' },
  character: { label: 'Designing characters', emoji: '🎭' },
  world: { label: 'Building the world', emoji: '🌍' },
  storyboard: { label: 'Storyboarding', emoji: '🎨' },
  image: { label: 'Generating images', emoji: '🖼️' },
  animation: { label: 'Animating', emoji: '🎬' },
  voice: { label: 'Recording voices', emoji: '🎙️' },
  music: { label: 'Composing soundtrack', emoji: '🎵' },
  sound: { label: 'Sound design', emoji: '🔊' },
  edit: { label: 'Editing', emoji: '🎞️' },
  quality: { label: 'Quality check', emoji: '✅' },
  render: { label: 'Rendering', emoji: '📦' },
  export: { label: 'Preparing creator pack', emoji: '🎉' },
}
