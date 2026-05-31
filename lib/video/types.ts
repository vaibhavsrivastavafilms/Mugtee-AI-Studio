import type { GeneratedScene } from '@/lib/cinematic/generation'

export type SubtitleSegment = {
  startSec: number
  endSec: number
  text: string
}

export type RenderSceneInput = {
  id: string
  imageUrl: string
  durationSec: number
  title?: string
}

export type FacelessRenderInput = {
  idea: string
  title: string
  script: string
  scenes: GeneratedScene[]
  voiceAudioPath: string | null
  voiceUrl: string | null
  subtitles: SubtitleSegment[]
  userId?: string | null
  projectId?: string | null
}

export type RenderProgressStage =
  | 'prepare'
  | 'download_assets'
  | 'render_segments'
  | 'assemble'
  | 'upload'
  | 'complete'
  | 'error'

export type RenderJobStatus = {
  jobId: string
  percent: number
  stage: RenderProgressStage
  label: string
  videoUrl: string | null
  thumbnailUrl: string | null
  status: 'queued' | 'running' | 'done' | 'failed'
  error: string | null
  mock?: boolean
  projectId?: string | null
  userId?: string | null
  /** Last progress touch — used to extend TTL for active renders */
  updatedAt?: number
}

export type RenderVideoResult = {
  videoUrl: string
  thumbnailUrl: string | null
  status: 'ready' | 'failed'
  durationSec: number
  mock?: boolean
  provider?: 'runway' | 'ffmpeg' | 'remotion'
}
