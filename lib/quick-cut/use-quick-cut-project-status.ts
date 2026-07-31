'use client'

import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  isQuickCutContentReady,
  isQuickCutExportReady,
  projectStatusStageLabel,
  resolveProjectStatus,
  type ProjectStatus,
} from '@/lib/quick-cut/project-status'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { computeProductionOsV2Eta, quickCutStepToEtaPhase } from '@/lib/production-os/v2/eta'
import { computeProductionOsV2Progress } from '@/lib/production-os/v2/progress'
import { PRODUCTION_OS_PHASE_ORDER, type ProductionOsPhaseId } from '@/lib/production-os/phases'
import { formatEtaLabel } from '@/lib/generation/generation-eta'

export function formatEtaRemaining(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds < 0) return null
  if (seconds === 0) return 'Done'
  return formatEtaLabel(Math.max(1, Math.floor(seconds)))
}

function completedPhasesFromStep(step: string): ProductionOsPhaseId[] {
  const current = quickCutStepToEtaPhase(step)
  if (!current) return [...PRODUCTION_OS_PHASE_ORDER]
  const idx = PRODUCTION_OS_PHASE_ORDER.indexOf(current)
  if (idx <= 0) return []
  return PRODUCTION_OS_PHASE_ORDER.slice(0, idx)
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
      currentStageStartedAt: s.currentStageStartedAt,
      renderStartedAt: s.renderStartedAt,
    }))
  )

  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!state.isGenerating && state.isComplete) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [state.isGenerating, state.isComplete])

  const scenesWithVideo = useMemo(
    () => state.scenes.filter((s) => s.videoUrl?.trim()).length,
    [state.scenes]
  )

  const imagesDone = useMemo(
    () =>
      state.scenes.filter((s) => Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim())).length,
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

  // Heal stuck EXPORTING @ 99% after MP4 URL arrives but poll lagged.
  useEffect(() => {
    if (!mp4ExportReady) return
    if (
      state.pipelineStatus === 'mp4_complete' &&
      state.isComplete &&
      !state.isGenerating &&
      !state.isRenderingVideo
    ) {
      return
    }
    useQuickCutGenerationStore.setState({
      pipelineStatus: 'mp4_complete',
      isComplete: true,
      isGenerating: false,
      isRenderingVideo: false,
      progress: 100,
      generationStep: 'complete',
      generationStatus: 'completed',
      eta: 0,
    })
  }, [
    mp4ExportReady,
    state.pipelineStatus,
    state.isComplete,
    state.isGenerating,
    state.isRenderingVideo,
  ])

  const currentPhase = quickCutStepToEtaPhase(state.generationStep)
  const completedPhases = completedPhasesFromStep(state.generationStep)

  const renderPercent =
    state.isRenderingVideo || state.pipelineStatus === 'mp4_rendering'
      ? Math.max(0, Math.min(99, state.progress))
      : null

  const liveProgress = exportReady
    ? 100
    : computeProductionOsV2Progress({
        currentPhase,
        completedPhases,
        imagesDone,
        imagesTotal: state.scenes.length,
        animationDone: scenesWithVideo,
        animationTotal: state.scenes.length,
        renderPercent,
        isComplete: exportReady,
      })

  // Prefer real counter progress; fall back to store bucket while idle.
  const progressPercent = exportReady
    ? 100
    : state.isGenerating
      ? Math.max(liveProgress, Math.min(99, Math.round(state.progress)))
      : Math.min(99, Math.max(0, Math.round(state.progress)))

  const eta = useMemo(() => {
    void tick
    return computeProductionOsV2Eta({
      currentPhase,
      completedPhases,
      phaseStartedAtMs: state.currentStageStartedAt,
      sceneCount: state.scenes.length,
      imagesDone,
      imagesTotal: state.scenes.length,
      animationDone: scenesWithVideo,
      animationTotal: state.scenes.length,
      renderPercent,
      renderStartedAtMs: state.renderStartedAt,
      isComplete: exportReady || status === 'COMPLETE',
    })
  }, [
    tick,
    currentPhase,
    completedPhases,
    state.currentStageStartedAt,
    state.scenes.length,
    imagesDone,
    scenesWithVideo,
    renderPercent,
    state.renderStartedAt,
    exportReady,
    status,
  ])

  // Persist live ETA into the store so other surfaces stay in sync.
  // Never write a lower progress (zombie job / analyzing step would reset to 0%).
  useEffect(() => {
    if (exportReady) {
      if (state.eta !== 0) useQuickCutGenerationStore.setState({ eta: 0 })
      return
    }
    if (state.isGenerating && state.eta !== eta.remainingSec) {
      useQuickCutGenerationStore.setState({
        eta: eta.remainingSec,
        progress: Math.max(state.progress || 0, progressPercent),
      })
    }
  }, [
    eta.remainingSec,
    exportReady,
    state.eta,
    state.isGenerating,
    state.progress,
    progressPercent,
  ])

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
    imagesDone,
    etaLabel: eta.label,
    etaDisplay: eta.display,
    etaSeconds: eta.remainingSec,
  }
}
