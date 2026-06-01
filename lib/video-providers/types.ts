import type { VisualStyle } from '@/lib/cinematic/workflow-state'

/** Per-scene input for AI video generation (not full script). */
export type SceneBlueprintInput = {
  sceneId: string
  narration: string
  imagePrompt: string
  motionDirection: string
  cameraMovement: string
  duration: number
  visualStyle?: string
  /** Source storyboard still for image-to-video */
  imageUrl?: string | null
}

export type VideoResult = {
  videoUrl: string
  thumbnailUrl: string | null
  duration: number
  provider: VideoProviderId
  generationTimeMs?: number
}

export type VideoProviderId = 'seedance' | 'runway' | 'kling' | 'luma'

export type VideoGenerationStatus = 'queued' | 'running' | 'done' | 'failed'

export interface VideoProvider {
  readonly id: VideoProviderId
  generateVideo(scene: SceneBlueprintInput): Promise<VideoResult>
}

export type BuildSceneVideoInputOptions = {
  visualStyle?: VisualStyle | null
  imageUrl?: string | null
}
