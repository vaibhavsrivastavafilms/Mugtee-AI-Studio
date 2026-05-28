'use client'

import { memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GenerationProgress } from '@/components/mugtee-home/generation-progress'
import { LiveGenerationPreview } from '@/components/mugtee-home/live-generation-preview'
import { GenerationComplete } from '@/components/mugtee-home/generation-complete'
import { useCinematicWorkflowStore } from '@/stores/cinematic-workflow-store'

const EASE = [0.22, 1, 0.36, 1] as const

export const GenerationPanel = memo(function GenerationPanel({
  quickCutReady = false,
  onOpenPreview,
}: {
  quickCutReady?: boolean
  onOpenPreview?: () => void
}) {
  const isPanelOpen = useCinematicWorkflowStore((s) => s.isPanelOpen)
  const isComplete = useCinematicWorkflowStore((s) => s.isComplete)
  const isGenerating = useCinematicWorkflowStore((s) => s.isGenerating)
  const error = useCinematicWorkflowStore((s) => s.error)
  const closeGenerationPanel = useCinematicWorkflowStore((s) => s.closeGenerationPanel)
  const resetWorkflow = useCinematicWorkflowStore((s) => s.resetWorkflow)

  const handleGenerateAnother = useCallback(() => {
    resetWorkflow()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder="Enter your video idea..."]'
      )?.focus()
    }, 400)
  }, [resetWorkflow])

  const handleClose = useCallback(() => {
    if (isGenerating) return
    closeGenerationPanel()
  }, [isGenerating, closeGenerationPanel])

  return (
    <AnimatePresence>
      {isPanelOpen ? (
        <motion.div
          key="generation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={handleClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Cinematic generation"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.55, ease: EASE }}
            className={cn(
              'relative w-full max-w-6xl max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden',
              'rounded-t-[1.75rem] sm:rounded-[1.75rem]',
              'glass-strong border border-gold-soft shadow-gold-glow film-grain'
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/[0.04] via-transparent to-black/40 pointer-events-none" />

            <div className="relative flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80">
                  Mugtee Studio
                </p>
                <h2 className="font-display text-lg sm:text-xl text-luxe">
                  {isComplete ? 'Production Complete' : 'Live Cinematic Generation'}
                </h2>
              </div>
              {!isGenerating ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-luxe/60 hover:text-luxe hover:border-white/20 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            <div className="relative overflow-y-auto max-h-[calc(100dvh-4.5rem)] sm:max-h-[calc(90dvh-4.5rem)] scrollbar-luxe">
              {error ? (
                <div className="p-6 text-center">
                  <p className="text-amber-200/90 text-sm" role="alert">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 text-[11px] tracking-[0.14em] uppercase text-luxe/50 hover:text-luxe transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : isComplete ? (
                <div className="p-5 sm:p-8">
                  <GenerationComplete
                    onGenerateAnother={handleGenerateAnother}
                    quickCutReady={quickCutReady}
                    onOpenPreview={onOpenPreview}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-5 sm:p-6 lg:p-8">
                  <div className="order-1 lg:order-1">
                    <GenerationProgress />
                  </div>
                  <div className="order-2 lg:order-2">
                    <LiveGenerationPreview />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
})
