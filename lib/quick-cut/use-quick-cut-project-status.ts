'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  isQuickCutContentReady,
  isQuickCutExportReady,
  projectStatusStageLabel,
  resolveProjectStatus,
  type ProjectStatus,
} from '@/lib/quick-cut/project-status'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function formatEtaRemaining(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m <= 0) return `${s}s Remaining`
  return `${m}m ${s}s Remaining`
}

export function useQuickCutProjectStatus() {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      isGenerating: s.isGenerating,
      generationStep: s.generationStep,
      generationStatus: s.generationStatus,
      isComplete: s.isComplete,
      pipelineStatus: s.pipelineStatus,
      isRenderingVideo: s.isRenderingVideo,
      videoUrl: s.videoUrl,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      directingSceneLabel: s.directingSceneLabel,
      progress: s.progress,
      eta: s.eta,
      title: s.title,
      hook: s.hook,
      duration: s.duration,
      language: s.language,
      thumbnailImageUrl: s.thumbnailImageUrl,
      savedProjectId: s.savedProjectId,
      generationStartedAt: s.generationStartedAt,
      exportCompletedAt: s.exportCompletedAt,
      exportPackageReady: s.exportPackageReady,
      videoRenderEnabled: s.videoRenderEnabled,
      voiceFallbackMessage: s.voiceFallbackMessage,
    }))
  )

  const scenesWithVideo = useMemo(
    () => state.scenes.filter((s) => s.videoUrl?.trim()).length,
    [state.scenes]
  )

  const status: ProjectStatus = useMemo(
    () =>
      resolveProjectStatus({
        isGenerating: state.isGenerating,
        generationStep: state.generationStep,
        generationStatus: state.generationStatus,
        pipelineStatus: state.pipelineStatus,
        isRenderingVideo: state.isRenderingVideo,
        videoUrl: state.videoUrl,
        scenesCount: state.scenes.length,
        scenesWithVideo,
        voiceUrl: state.voiceUrl,
        directingSceneLabel: state.directingSceneLabel,
        exportPackageReady: state.exportPackageReady,
        videoRenderEnabled: state.videoRenderEnabled,
        voiceFallbackMessage: state.voiceFallbackMessage,
      }),
    [state, scenesWithVideo]
  )

  const stageLabel = useMemo(
    () =>
      projectStatusStageLabel(status, {
        scenesCount: state.scenes.length,
        scenesWithVideo,
        directingSceneLabel: state.directingSceneLabel,
      }),
    [status, state.scenes.length, scenesWithVideo, state.directingSceneLabel]
  )

  const exportReady = isQuickCutContentReady({
    videoUrl: state.videoUrl,
    pipelineStatus: state.pipelineStatus,
    exportPackageReady: state.exportPackageReady,
    videoRenderEnabled: state.videoRenderEnabled,
    isComplete: state.isComplete,
  })

  const mp4ExportReady = isQuickCutExportReady({
    videoUrl: state.videoUrl,
    pipelineStatus: state.pipelineStatus,
  })

  const progressPercent = exportReady
    ? 100
    : Math.min(99, Math.max(0, Math.round(state.progress)))

  const projectName =
    state.title?.trim() ||
    state.hook?.trim().slice(0, 64) ||
    'Your Reel'

  return {
    ...state,
    status,
    stageLabel,
    exportReady,
    mp4ExportReady,
    progressPercent,
    projectName,
    scenesCount: state.scenes.length,
    scenesWithVideo,
    etaLabel: formatEtaRemaining(state.eta > 0 ? state.eta : null),
  }
}
