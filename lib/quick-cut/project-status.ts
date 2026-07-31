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

  // Valid MP4 URL already on the client — treat as complete even if poll lag
  // briefly leaves pipelineStatus on mp4_rendering.
  if (isValidReelDownloadUrl(input.videoUrl) && !input.isGenerating) {
    return 'COMPLETE'
  }

  // Never stick on VOICEOVER after soft skip when generation already finished.
  if (
    !input.isGenerating &&
    input.voiceFallbackMessage &&
    !input.voiceUrl?.trim() &&
    input.generationStep !== 'complete' &&
    input.generationStep !== 'idle' &&
    input.generationStep !== 'render'
  ) {
    return 'VOICEOVER'
  }

  if (input.pipelineStatus === 'mp4_rendering' || input.isRenderingVideo) {
    // Don't show Exporting forever after the file is already available.
    if (isValidReelDownloadUrl(input.videoUrl)) return 'COMPLETE'
    return input.pipelineStatus === 'mp4_rendering' ? 'EXPORTING' : 'RENDERING'
  }

  // Scenes already exist → never show Researching (stale analyzing / zombie job).
  if (
    input.scenesCount > 0 &&
    (input.generationStep === 'analyzing' ||
      input.generationStep === 'hook' ||
      input.generationStep === 'render' ||
      input.generationStep === 'idle')
  ) {
    if (input.generationStep === 'render' || input.isRenderingVideo) {
      return 'EXPORTING'
    }
    if (input.isGenerating || input.generationStatus === 'generating') {
      return 'ASSEMBLY'
    }
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
  if (!isValidReelDownloadUrl(input.videoUrl)) return false
  // Accept mp4_complete, or a brief poll lag still on mp4_rendering with URL present.
  return (
    input.pipelineStatus === 'mp4_complete' ||
    input.pipelineStatus === 'mp4_rendering'
  )
}

/** Content ready for results — requires a verified MP4 when render is enabled. */
export function isQuickCutContentReady(input: {
  videoUrl: string | null
  pipelineStatus: ReelPipelineStatus
  exportPackageReady?: boolean
  videoRenderEnabled?: boolean
  isComplete?: boolean
}): boolean {
  if (isQuickCutExportReady(input)) return true
  // Pack-only only when server MP4 is explicitly disabled.
  if (input.videoRenderEnabled) return false
  if (input.isComplete && input.exportPackageReady) return true
  if (input.exportPackageReady && input.pipelineStatus === 'timeline_complete') {
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
