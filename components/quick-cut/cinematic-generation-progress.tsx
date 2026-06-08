'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, Loader2 } from 'lucide-react'
import {
  resolveCinematicGenerationProgress,
  type ProgressStageStatus,
} from '@/lib/quick-cut/cinematic-generation-progress'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

function StageIcon({ status }: { status: ProgressStageStatus }) {
  if (status === 'completed') {
    return <Check className="w-3 h-3 text-emerald-300/90 shrink-0" aria-hidden />
  }
  if (status === 'current') {
    return <Loader2 className="w-3 h-3 text-gold-300 animate-spin shrink-0" aria-hidden />
  }
  return <Circle className="w-2.5 h-2.5 text-luxe/25 shrink-0" aria-hidden />
}

type CinematicGenerationProgressProps = {
  className?: string
}

/** Live generation progress above the Output preview — driven by pipeline state, not timers. */
export function CinematicGenerationProgress({ className }: CinematicGenerationProgressProps) {
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
      scenesCount: s.scenes.length,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      progress: s.progress,
    }))
  )

  const snapshot = useMemo(() => resolveCinematicGenerationProgress(input), [input])

  const show =
    input.isGenerating ||
    input.isComplete ||
    input.isRenderingVideo ||
    (input.generationStep !== 'idle' &&
      input.generationStep !== 'error' &&
      input.generationStep !== 'complete')

  if (!show) return null

  const clamped = Math.max(0, Math.min(100, snapshot.percent))

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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

      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'h-full rounded-full',
            snapshot.isReady
              ? 'bg-gradient-to-r from-emerald-600/80 via-emerald-400/90 to-emerald-300'
              : 'bg-gradient-to-r from-gold-600/70 via-gold-400 to-gold-300 shadow-[0_0_14px_rgba(212,175,55,0.35)]'
          )}
        />
      </div>

      {snapshot.currentStepLabel ? (
        <div className="space-y-0.5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">Current Step</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={snapshot.currentStepLabel}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25 }}
              className="text-[12px] sm:text-[13px] text-luxe/80 leading-snug"
            >
              {snapshot.currentStepLabel}
            </motion.p>
          </AnimatePresence>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-0.5">
        {snapshot.completedLabels.length > 0 ? (
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 mb-1.5">Completed</p>
            <ul className="flex flex-wrap gap-1.5">
              {snapshot.stages
                .filter((s) => s.status === 'completed')
                .map((stage) => (
                  <li
                    key={stage.id}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] text-emerald-100/85"
                  >
                    <Check className="w-2.5 h-2.5 shrink-0" aria-hidden />
                    {stage.label}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {snapshot.remainingLabels.length > 0 && !snapshot.isReady ? (
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 mb-1.5">Remaining</p>
            <ul className="flex flex-wrap gap-1.5">
              {snapshot.stages
                .filter((s) => s.status === 'pending' || s.status === 'failed')
                .map((stage) => (
                  <li
                    key={stage.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/35 px-2 py-0.5 text-[10px] text-luxe/55"
                  >
                    <StageIcon status={stage.status} />
                    {stage.label}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ul className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 pt-0.5 border-t border-white/[0.05]">
        {snapshot.stages.map((stage) => (
          <li
            key={stage.id}
            className={cn(
              'inline-flex items-center gap-1 text-[10px] tracking-wide',
              stage.status === 'completed' && 'text-emerald-200/80',
              stage.status === 'current' && 'text-gold-200/90',
              stage.status === 'pending' && 'text-luxe/40',
              stage.status === 'failed' && 'text-red-300/80'
            )}
          >
            <StageIcon status={stage.status} />
            {stage.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
