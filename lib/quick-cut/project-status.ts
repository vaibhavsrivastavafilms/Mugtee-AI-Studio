/**
 * Quick Cut V2 — single source of truth for project generation status.
 */

import type { ReelPipelineStatus } from '@/lib/pipeline/reel-generation-orchestrator'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type ProjectStatus =
  | 'QUEUED'
  | 'RESEARCHING'
  | 'WRITING_SCRIPT'
  | 'VIDEO_GENERATION'
  | 'VOICEOVER'
  | 'CAPTIONS'
  | 'MUSIC'
  | 'ASSEMBLY'
  | 'RENDERING'
  | 'EXPORTING'
  | 'COMPLETE'
  | 'FAILED'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  QUEUED: 'Queued',
  RESEARCHING: 'Researching Topic',
  WRITING_SCRIPT: 'Writing Script',
  VIDEO_GENERATION: 'Creating Video Scenes',
  VOICEOVER: 'Generating Voiceover',
  CAPTIONS: 'Adding Captions',
  MUSIC: 'Adding Music',
  ASSEMBLY: 'Assembling Reel',
  RENDERING: 'Rendering Reel',
  EXPORTING: 'Exporting MP4',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
}

export type QuickCutStatusInput = {
  isGenerating: boolean
  generationStep: QuickCutGenerationStep
  generationStatus: string
  pipelineStatus: ReelPipelineStatus
  isRenderingVideo: boolean
  videoUrl: string | null
  scenesCount: number
  scenesWithVideo: number
  voiceUrl: string | null
  directingSceneLabel: string | null
}

export function resolveProjectStatus(input: QuickCutStatusInput & {
  exportPackageReady?: boolean
  videoRenderEnabled?: boolean
  voiceFallbackMessage?: string | null
}): ProjectStatus {
  if (input.pipelineStatus === 'failed' || input.generationStatus === 'failed') {
    return 'FAILED'
  }

  if (
    isQuickCutContentReady({
      videoUrl: input.videoUrl,
      pipelineStatus: input.pipelineStatus,
      exportPackageReady: input.exportPackageReady,
      videoRenderEnabled: input.videoRenderEnabled,
    })
  ) {
    return 'COMPLETE'
  }

  if (!input.isGenerating && input.voiceFallbackMessage && !input.voiceUrl?.trim()) {
    return 'VOICEOVER'
  }

  if (input.pipelineStatus === 'mp4_rendering' || input.isRenderingVideo) {
    return input.pipelineStatus === 'mp4_rendering' ? 'EXPORTING' : 'RENDERING'
  }

  if (input.pipelineStatus === 'timeline_assembling' || input.pipelineStatus === 'timeline_complete') {
    return 'ASSEMBLY'
  }

  if (input.pipelineStatus === 'captions_generating' || input.pipelineStatus === 'captions_complete') {
    return 'CAPTIONS'
  }

  if (input.pipelineStatus === 'voice_generating' || input.pipelineStatus === 'voice_complete') {
    return 'VOICEOVER'
  }

  if (
    input.pipelineStatus === 'video_generating' ||
    input.pipelineStatus === 'video_complete' ||
    input.generationStep === 'motion' ||
    input.generationStep === 'images'
  ) {
    return 'VIDEO_GENERATION'
  }

  if (
    input.pipelineStatus === 'script_generating' ||
    input.pipelineStatus === 'script_complete' ||
    input.generationStep === 'script' ||
    input.generationStep === 'scenes'
  ) {
    return 'WRITING_SCRIPT'
  }

  if (input.generationStep === 'analyzing' || input.generationStep === 'hook') {
    return 'RESEARCHING'
  }

  if (!input.isGenerating && input.generationStep === 'idle') {
    return 'QUEUED'
  }

  return 'QUEUED'
}

export function projectStatusStageLabel(
  status: ProjectStatus,
  input: Pick<
    QuickCutStatusInput,
    'scenesCount' | 'scenesWithVideo' | 'directingSceneLabel'
  >
): string {
  if (status === 'VIDEO_GENERATION' && input.scenesCount > 0) {
    const n = Math.min(input.scenesCount, Math.max(1, input.scenesWithVideo + 1))
    if (input.directingSceneLabel?.toLowerCase().includes('video')) {
      return `Creating Scene ${n} of ${input.scenesCount}`
    }
    return `Creating Scene ${n} of ${input.scenesCount}`
  }
  return PROJECT_STATUS_LABEL[status]
}

/** Export readiness — never show complete without a valid MP4. */
export function isQuickCutExportReady(input: {
  videoUrl: string | null
  pipelineStatus: ReelPipelineStatus
}): boolean {
  return (
    input.pipelineStatus === 'mp4_complete' &&
    Boolean(input.videoUrl?.trim()) &&
    isValidReelDownloadUrl(input.videoUrl)
  )
}

/** Content ready for results — MP4 or creator pack when server export is disabled. */
export function isQuickCutContentReady(input: {
  videoUrl: string | null
  pipelineStatus: ReelPipelineStatus
  exportPackageReady?: boolean
  videoRenderEnabled?: boolean
  isComplete?: boolean
}): boolean {
  if (isQuickCutExportReady(input)) return true
  if (input.isComplete && !input.videoRenderEnabled && input.exportPackageReady) return true
  if (!input.videoRenderEnabled && input.exportPackageReady && input.pipelineStatus === 'timeline_complete') {
    return true
  }
  return false
}

export function isQuickCutMp4ExportReady(input: {
  videoUrl: string | null
  pipelineStatus: ReelPipelineStatus
}): boolean {
  return isQuickCutExportReady(input)
}
