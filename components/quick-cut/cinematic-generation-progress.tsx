'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Plus, Square } from 'lucide-react'
import { resolveCinematicGenerationProgress } from '@/lib/quick-cut/cinematic-generation-progress'
import {
  resolveExportFrameProgress,
  resolveStoryboardSceneProgress,
} from '@/lib/quick-cut/generation-hud'
import { computeGenerationEta, formatTimingBlock } from '@/lib/generation/generation-eta'
import { allStageAverages } from '@/lib/generation/generation-stage-timing.client'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { sumSceneDurationSec } from '@/lib/cinematic/scene-duration'
import { PostExportActions } from '@/components/quick-cut/post-export-actions'
import { DirectorCommentaryPanel } from '@/components/quick-cut/director-commentary-panel'
import { CinematicExportHud } from '@/components/quick-cut/cinematic-export-hud'
import { SceneApprovalSummary } from '@/components/quick-cut/scene-approval-summary'
import { GenerationStageTimeline } from '@/components/quick-cut/generation-stage-timeline'
import { outlineGoldButton } from '@/components/home/cinematic-home-styles'
import { v4DangerOutline } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'

type CinematicGenerationProgressProps = {
  className?: string
}

/** Cinematic Generation HUD — live state above the Output window. */
export function CinematicGenerationProgress({ className }: CinematicGenerationProgressProps) {
  const mounted = useClientMounted()
  const [tick, setTick] = useState(0)

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
      hook: s.hook,
      script: s.script,
      scenes: s.scenes,
      scenesCount: s.scenes.length,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      progress: s.progress,
      renderStartedAt: s.renderStartedAt,
      currentStageStartedAt: s.currentStageStartedAt,
      generationStartedAt: s.generationStartedAt,
      generationCoreCompletedAt: s.generationCoreCompletedAt,
      exportCompletedAt: s.exportCompletedAt,
      duration: s.duration,
      reelTimeline: s.reelTimeline,
      generationInFlight: s.generationInFlight,
      savedProjectId: s.savedProjectId,
    }))
  )

  const stopGeneration = useQuickCutGenerationStore((s) => s.stopGeneration)

  const progressInput = useMemo(
    () => ({
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

  useEffect(() => {
    if (!input.isGenerating && !input.isRenderingVideo) return
    const id = window.setInterval(() => setTick((t) => t + 1), 2_000)
    return () => window.clearInterval(id)
  }, [input.isGenerating, input.isRenderingVideo])

  const snapshot = useMemo(
    () => resolveCinematicGenerationProgress(progressInput),
    [progressInput]
  )

  const timelineStages = useMemo(
    () =>
      snapshot.stages
        .filter((s) => s.group === 'core')
        .map((s) => ({ id: s.id, label: s.label, status: s.status })),
    [snapshot.stages]
  )

  const storyboardProgress = useMemo(
    () =>
      resolveStoryboardSceneProgress({
        generationStep: input.generationStep,
        sectionStatus: input.sectionStatus,
        scenes: input.scenes,
        directingSceneLabel: input.directingSceneLabel,
      }),
    [input.generationStep, input.sectionStatus, input.scenes, input.directingSceneLabel]
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
    [
      input.isRenderingVideo,
      input.renderPollUrl,
      input.videoUrl,
      input.progress,
      input.renderStatusLabel,
      totalDurationSec,
    ]
  )

  const stageAveragesMs = useMemo(
    () => (mounted ? allStageAverages(input.scenesCount) : {}),
    [mounted, input.scenesCount, tick]
  )

  const eta = useMemo(() => {
    if (!mounted) {
      return {
        etaSeconds: null,
        etaLabel: null,
        exportEtaSeconds: null,
        exportEtaLabel: null,
        isExportPhase: false,
      }
    }
    return computeGenerationEta({
      snapshot,
      stageAveragesMs,
      currentStageStartedAtMs: input.currentStageStartedAt,
      exportRenderStartedAtMs: input.renderStartedAt,
      exportProgressPercent: exportProgress?.progressPercent ?? input.progress,
      sceneCount: input.scenesCount,
    })
  }, [
    mounted,
    snapshot,
    stageAveragesMs,
    input.currentStageStartedAt,
    input.renderStartedAt,
    input.progress,
    input.scenesCount,
    exportProgress?.progressPercent,
    tick,
  ])

  const completionTiming = useMemo(() => {
    if (!mounted || !snapshot.isReady || !input.generationStartedAt) return null
    const coreEnd =
      input.generationCoreCompletedAt ??
      input.exportCompletedAt ??
      input.renderStartedAt ??
      Date.now()
    const generationMs = Math.max(0, coreEnd - input.generationStartedAt)
    const exportMs =
      input.exportCompletedAt && input.renderStartedAt
        ? Math.max(0, input.exportCompletedAt - input.renderStartedAt)
        : input.exportCompletedAt && input.generationCoreCompletedAt
          ? Math.max(0, input.exportCompletedAt - input.generationCoreCompletedAt)
          : null
    return formatTimingBlock({ generationMs, exportMs })
  }, [
    mounted,
    snapshot.isReady,
    input.generationStartedAt,
    input.generationCoreCompletedAt,
    input.exportCompletedAt,
    input.renderStartedAt,
  ])

  const handleNewReel = useCallback(() => {
    resetQuickCutForFreshCreate()
  }, [])

  const show =
    input.isGenerating ||
    input.isComplete ||
    input.isRenderingVideo ||
    input.generationInFlight ||
    (input.generationStep !== 'idle' &&
      input.generationStep !== 'error' &&
      input.generationStep !== 'complete')

  const isActiveGeneration =
    input.isGenerating || input.generationInFlight || input.isRenderingVideo

  if (!show) return null

  const clamped = Math.max(0, Math.min(100, snapshot.percent))
  const currentStageLabel =
    exportProgress?.label ??
    storyboardProgress?.currentSceneLabel ??
    snapshot.currentStepLabel

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/20 bg-gradient-to-b from-black/55 to-black/35',
        'shadow-[0_0_24px_rgba(212,175,55,0.06)] px-3 sm:px-4 py-3 sm:py-3.5 space-y-3',
        className
      )}
      aria-label="Generation progress"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.h3
              key={snapshot.headline}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'text-[12px] sm:text-[13px] font-medium tracking-wide',
                snapshot.isReady ? 'text-emerald-200/95' : 'text-[#F4E7C1]'
              )}
            >
              {snapshot.headline}
            </motion.h3>
          </AnimatePresence>
          <motion.span
            key={clamped}
            initial={{ opacity: 0.7, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm sm:text-base font-medium text-gold-300/95 tabular-nums"
          >
            {clamped}%
          </motion.span>
        </div>

        <button
          type="button"
          onClick={handleNewReel}
          className={cn(
            outlineGoldButton,
            'shrink-0 px-3 py-1.5 min-h-[32px] text-[9px] border-white/20 text-white/75'
          )}
        >
          <Plus className="w-3 h-3 text-gold-300/80" aria-hidden />
          New Reel
        </button>
      </div>

      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'h-full rounded-full',
            snapshot.isReady
              ? 'bg-gradient-to-r from-emerald-600/80 via-emerald-400/90 to-emerald-300'
              : 'bg-[repeating-linear-gradient(110deg,#B8962E_0px,#B8962E_8px,#D4AF37_8px,#D4AF37_16px,#E8C547_16px,#E8C547_24px)] shadow-[0_0_14px_rgba(212,175,55,0.35)]'
          )}
        />
      </div>

      {!snapshot.isReady ? (
        <GenerationStageTimeline stages={timelineStages} className="-mx-1" />
      ) : null}

      {!snapshot.isReady ? <DirectorCommentaryPanel /> : null}

      {mounted && !snapshot.isReady && eta.etaLabel ? (
        <div className="space-y-0.5">
          <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/55">
            Estimated Time Remaining
          </p>
          <p className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-gold-100/90 tabular-nums">
            <Clock className="w-3 h-3 shrink-0 text-gold-300/60" aria-hidden />
            {eta.etaLabel}
          </p>
        </div>
      ) : null}

      {currentStageLabel && !snapshot.isReady ? (
        <div className="rounded-lg border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2 space-y-0.5">
          <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">Current Stage</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStageLabel}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25 }}
              className="text-[12px] sm:text-[13px] text-luxe/85 leading-snug"
            >
              {currentStageLabel}
            </motion.p>
          </AnimatePresence>
          {storyboardProgress?.isActive && storyboardProgress.totalCount > 0 ? (
            <p className="text-[11px] text-luxe/50 tabular-nums">
              Scene {storyboardProgress.currentSceneIndex} of {storyboardProgress.totalCount}
            </p>
          ) : null}
        </div>
      ) : null}

      {mounted && (exportProgress?.isActive || input.videoUrl) ? (
        <CinematicExportHud
          exportProgress={exportProgress}
          renderStatusLabel={input.renderStatusLabel}
          videoUrl={input.videoUrl}
          sceneCount={input.scenesCount}
          etaLabel={eta.exportEtaLabel ?? eta.etaLabel}
        />
      ) : null}

      {input.scenes.length > 0 ? (
        <SceneApprovalSummary
          projectKey={input.savedProjectId || 'quick-draft'}
          scenes={input.scenes}
        />
      ) : null}

      {isActiveGeneration && !snapshot.isReady ? (
        <p className="text-[10px] text-luxe/50">
          Saving automatically…
        </p>
      ) : null}

      {mounted && snapshot.isReady && completionTiming ? (
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-2 space-y-0.5">
          {completionTiming.generation ? (
            <p className="text-[11px] text-emerald-100/85">
              Generation Time{' '}
              <span className="tabular-nums font-medium">{completionTiming.generation}</span>
            </p>
          ) : null}
          {completionTiming.export ? (
            <p className="text-[11px] text-emerald-100/85">
              Export Time{' '}
              <span className="tabular-nums font-medium">{completionTiming.export}</span>
            </p>
          ) : null}
          {completionTiming.total ? (
            <p className="text-[11px] text-emerald-100/85">
              Total Time{' '}
              <span className="tabular-nums font-medium">{completionTiming.total}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {snapshot.isReady ? (
        <PostExportActions hideHeader className="border-0 bg-transparent p-0 shadow-none" />
      ) : null}

      {isActiveGeneration && !snapshot.isReady ? (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={() => void stopGeneration()}
            className={cn(v4DangerOutline, 'px-3 py-1.5 font-semibold')}
          >
            <Square className="w-3 h-3 fill-current" aria-hidden />
            Stop
          </button>
        </div>
      ) : null}
    </section>
  )
}
