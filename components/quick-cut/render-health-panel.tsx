'use client'

import { useMemo } from 'react'
import { resolveRenderHealth } from '@/lib/quick-cut/render-health'
import { resolveExportFrameProgress } from '@/lib/quick-cut/generation-hud'
import { resolveCinematicGenerationProgress } from '@/lib/quick-cut/cinematic-generation-progress'
import { computeGenerationEta } from '@/lib/generation/generation-eta'
import { allStageAverages } from '@/lib/generation/generation-stage-timing.client'
import { sumSceneDurationSec } from '@/lib/cinematic/scene-duration'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type RenderHealthPanelProps = {
  className?: string
}

export function RenderHealthPanel({ className }: RenderHealthPanelProps) {
  const input = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isGenerating: s.isGenerating,
      isComplete: s.isComplete,
      isRenderingVideo: s.isRenderingVideo,
      videoRenderEnabled: s.videoRenderEnabled,
      renderPollUrl: s.renderPollUrl,
      videoUrl: s.videoUrl,
      renderStatusLabel: s.renderStatusLabel,
      renderError: s.renderError,
      hook: s.hook,
      script: s.script,
      scenesCount: s.scenes.length,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      progress: s.progress,
      duration: s.duration,
      reelTimeline: s.reelTimeline,
      renderStartedAt: s.renderStartedAt,
      currentStageStartedAt: s.currentStageStartedAt,
    }))
  )

  const snapshot = useMemo(
    () =>
      resolveCinematicGenerationProgress({
        generationStep: input.generationStep,
        sectionStatus: input.sectionStatus,
        isGenerating: input.isGenerating,
        isComplete: input.isComplete,
        isRenderingVideo: input.isRenderingVideo,
        videoRenderEnabled: input.videoRenderEnabled,
        renderPollUrl: input.renderPollUrl,
        videoUrl: input.videoUrl,
        renderStatusLabel: input.renderStatusLabel,
        hook: input.hook,
        script: input.script,
        scenesCount: input.scenesCount,
        voiceUrl: input.voiceUrl,
        exportPackageReady: input.exportPackageReady,
        directingSceneLabel: input.directingSceneLabel,
        hookProgressLabel: input.hookProgressLabel,
        progress: input.progress,
      }),
    [input]
  )

  const totalDurationSec = useMemo(() => {
    if (input.reelTimeline?.totalDurationSec) return input.reelTimeline.totalDurationSec
    const fromScenes = sumSceneDurationSec(input.scenes)
    return fromScenes > 0 ? fromScenes : input.duration
  }, [input.reelTimeline, input.scenes, input.duration])

  const exportProgress = useMemo(
    () =>
      resolveExportFrameProgress({
        isRenderingVideo: input.isRenderingVideo,
        renderPollUrl: input.renderPollUrl,
        videoUrl: input.videoUrl,
        progress: input.progress,
        renderStatusLabel: input.renderStatusLabel,
        totalDurationSec,
      }),
    [input, totalDurationSec]
  )

  const eta = useMemo(
    () =>
      computeGenerationEta({
        snapshot,
        stageAveragesMs: allStageAverages(input.scenesCount),
        currentStageStartedAtMs: input.currentStageStartedAt,
        exportRenderStartedAtMs: input.renderStartedAt,
        exportProgressPercent: exportProgress?.progressPercent ?? input.progress,
        sceneCount: input.scenesCount,
      }),
    [snapshot, input, exportProgress]
  )

  const health = useMemo(
    () =>
      resolveRenderHealth({
        isRenderingVideo: input.isRenderingVideo,
        renderPollUrl: input.renderPollUrl,
        videoUrl: input.videoUrl,
        renderError: input.renderError,
        renderStatusLabel: input.renderStatusLabel,
        progressPercent: exportProgress?.progressPercent ?? snapshot.percent,
        currentFrame: exportProgress?.currentFrame ?? 0,
        totalFrames: exportProgress?.totalFrames ?? 0,
        sceneCount: input.scenesCount,
        currentStage: snapshot.currentStepLabel ?? input.generationStep,
        etaLabel: eta.etaLabel,
        renderStartedAt: input.renderStartedAt,
      }),
    [input, exportProgress, snapshot, eta]
  )

  if (!health) return null

  return (
    <div className={cn('rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2', className)}>
      <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 mb-2">Render Health</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <dt className="text-luxe/40">Resolution</dt>
        <dd className="text-luxe/75 tabular-nums">{health.resolution}</dd>
        <dt className="text-luxe/40">FPS</dt>
        <dd className="text-luxe/75 tabular-nums">{health.fps}</dd>
        {health.totalFrames > 0 ? (
          <>
            <dt className="text-luxe/40">Frames</dt>
            <dd className="text-luxe/75 tabular-nums">
              {health.currentFrame} / {health.totalFrames}
            </dd>
          </>
        ) : null}
        <dt className="text-luxe/40">Scenes</dt>
        <dd className="text-luxe/75 tabular-nums">{health.sceneCount}</dd>
        <dt className="text-luxe/40">Status</dt>
        <dd
          className={cn(
            health.status === 'Healthy' && 'text-emerald-300/90',
            health.status === 'Rendering' && 'text-gold-200/90',
            health.status === 'Failed' && 'text-red-300/90',
            health.status === 'Stalled' && 'text-amber-300/90'
          )}
        >
          {health.status}
        </dd>
        {health.etaLabel ? (
          <>
            <dt className="text-luxe/40">ETA</dt>
            <dd className="text-luxe/75 tabular-nums">{health.etaLabel}</dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}
