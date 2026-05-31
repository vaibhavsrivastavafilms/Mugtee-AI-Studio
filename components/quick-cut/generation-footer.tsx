'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { AchievementToast } from '@/components/mission/achievement-toast'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'
import { MissionTimeline } from '@/components/mission/mission-timeline'
import { ProjectCompletionMeter } from '@/components/mission/project-completion-meter'
import { GenerationSaveIndicator } from '@/components/quick-cut/generation-save-indicator'
import { ContentSeriesTrigger } from '@/components/quick-cut/content-series-panel'
import { RenderProgress } from '@/components/quick-cut/render-progress'
import { companionCopy } from '@/lib/companion/microcopy'
import { missionCompletionPercent } from '@/lib/mission/mission-steps'
import { useMissionGenerationSync } from '@/lib/mission/use-mission-generation-sync'
import { cn } from '@/lib/utils'
import { useMissionStore } from '@/stores/mission-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Bottom padding for scrollable content so it clears the fixed generation footer. */
export const GENERATION_FOOTER_CLEARANCE = 'pb-60 sm:pb-56'

function XpFloat() {
  const floatingXp = useMissionStore((s) => s.floatingXp)
  const clearFloatingXp = useMissionStore((s) => s.clearFloatingXp)

  useEffect(() => {
    if (!floatingXp) return
    const t = window.setTimeout(clearFloatingXp, 1800)
    return () => window.clearTimeout(t)
  }, [floatingXp, clearFloatingXp])

  return (
    <AnimatePresence>
      {floatingXp ? (
        <motion.span
          key={floatingXp.id}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -20 }}
          exit={{ opacity: 0 }}
          className="absolute -top-1 right-0 text-xs font-medium text-[var(--v2-gold)] pointer-events-none whitespace-nowrap"
        >
          +{floatingXp.amount} XP
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}

export function QuickCutGenerationFooter({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  useMissionGenerationSync(sectionStatus, generationStep, isGenerating || isComplete)

  const missionCompletion = missionCompletionPercent(sectionStatus, generationStep)
  const showMission =
    isGenerating || isComplete || (generationStep !== 'idle' && generationStep !== 'error')

  const subtitle = hook
    ? 'Hook ready — open Hook tab'
    : generationStep === 'title' || generationStep === 'analyzing'
      ? companionCopy('generating')
      : isComplete
        ? companionCopy('storyReady')
        : companionCopy('generating')

  return (
    <>
      <AchievementToast />
      <footer
        className={cn(
          'fixed bottom-0 inset-x-0 z-40',
          'border-t border-gold-500/15 bg-black/85 backdrop-blur-xl',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          className
        )}
        aria-label="Generation progress"
      >
        <div
          className={cn(
            'max-w-6xl mx-auto',
            'px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
            'py-3 sm:py-4 space-y-2.5 sm:space-y-3'
          )}
        >
          {showMission ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative shrink-0">
                <CreatorLevelBadge className="justify-start" />
                <XpFloat />
              </div>
              <ProjectCompletionMeter
                percent={missionCompletion}
                compact
                className="flex-1 min-w-0"
              />
            </div>
          ) : null}

          {showMission && !isComplete ? (
            <MissionTimeline
              sectionStatus={sectionStatus}
              generationStep={generationStep}
              compact
              horizontal
            />
          ) : null}

          {title ? (
            <CinematicTitleReveal
              title={title}
              subtitle={subtitle}
              className="!text-left items-start !space-y-1"
            />
          ) : null}

          <RenderProgress />

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <GenerationSaveIndicator />
            <ContentSeriesTrigger variant="footer" />
          </div>
        </div>
      </footer>
    </>
  )
}
