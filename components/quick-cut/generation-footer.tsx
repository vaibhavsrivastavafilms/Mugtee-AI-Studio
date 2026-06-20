'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AchievementToast } from '@/components/mission/achievement-toast'
import { GenerationSaveIndicator } from '@/components/quick-cut/generation-save-indicator'
import { ExportRetryStrip } from '@/components/quick-cut/render-progress'
import { ContentSeriesTrigger } from '@/components/quick-cut/content-series-panel'
import { MockScriptBadge } from '@/components/quick-cut/mock-script-badge'
import { useMissionGenerationSync } from '@/lib/mission/use-mission-generation-sync'
import { cn } from '@/lib/utils'
import { useMissionStore } from '@/stores/mission-store'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Bottom padding for scrollable content so it clears the fixed generation footer (+ mobile sidekick). */
export const GENERATION_FOOTER_CLEARANCE =
  'pb-[max(8.5rem,calc(6.5rem+env(safe-area-inset-bottom)))] sm:pb-28 lg:pb-20'

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
  const { generationStep, sectionStatus, isComplete, isGenerating } =
    useQuickCutGenerationStore(
      useShallow((s) => ({
        generationStep: s.generationStep,
        sectionStatus: s.sectionStatus,
        isComplete: s.isComplete,
        isGenerating: s.isGenerating,
      }))
    )

  useMissionGenerationSync(sectionStatus, generationStep, isGenerating || isComplete)

  const showFooter =
    isGenerating || isComplete || (generationStep !== 'idle' && generationStep !== 'error')

  if (!showFooter) return <AchievementToast />

  return (
    <>
      <AchievementToast />
      <footer
        className={cn(
          'fixed bottom-0 inset-x-0 z-40',
          'border-t border-gold-500/10 bg-black/90 backdrop-blur-xl',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          className
        )}
        aria-label="Generation utilities"
      >
        <div
          className={cn(
            'max-w-6xl mx-auto',
            'px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
            'py-2 space-y-2'
          )}
        >
          <ExportRetryStrip />

          <div className="relative flex flex-wrap items-center gap-2">
            <XpFloat />
            <MockScriptBadge />
            <GenerationSaveIndicator persistent className="sm:hidden" />
            <GenerationSaveIndicator className="hidden sm:inline-flex" />
            <ContentSeriesTrigger variant="footer" />
          </div>
        </div>
      </footer>
    </>
  )
}
