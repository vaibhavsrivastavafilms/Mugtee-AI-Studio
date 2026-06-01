'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  continueCtaLabel,
  inferNextIncompleteStackedStep,
  isExportMissionComplete,
  nextMissionStep,
} from '@/lib/workflow/workflow-continuity'
import {
  applyWorkflowHashFromLocation,
  navigateToStep,
} from '@/lib/workflow/workflow-navigation'
import type { WorkflowStepId } from '@/lib/workflow/workflow-step-map'
import { loadWorkflowSession } from '@/lib/workflow/workflow-session'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

function MissionCompleteBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-xl border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.08] via-black/40 to-black/60 px-4 py-3"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      <p className="relative text-sm font-display text-[#F4E7C1] tracking-tight">
        Mission Complete — Your cinematic package is ready.
      </p>
      <p className="relative text-[11px] text-luxe/50 mt-0.5 italic">
        Export, publish, or repurpose from the section below.
      </p>
    </motion.div>
  )
}

type WorkflowNavigatorProps = {
  className?: string
}

/**
 * Restores workflow position, auto-advances on stage completion,
 * and surfaces intelligent "Continue →" CTAs.
 */
export function WorkflowNavigator({ className }: WorkflowNavigatorProps) {
  const {
    sectionStatus,
    generationStep,
    isComplete,
    isGenerating,
    hook,
    script,
    scenes,
    voiceUrl,
    exportPackageReady,
    videoUrl,
    currentWorkflowStep,
    syncWorkflowFromPipeline,
    setCurrentWorkflowStep,
    markWorkflowStepComplete,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      sectionStatus: s.sectionStatus,
      generationStep: s.generationStep,
      isComplete: s.isComplete,
      isGenerating: s.isGenerating,
      hook: s.hook,
      script: s.script,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      exportPackageReady: s.exportPackageReady,
      videoUrl: s.videoUrl,
      currentWorkflowStep: s.currentWorkflowStep,
      syncWorkflowFromPipeline: s.syncWorkflowFromPipeline,
      setCurrentWorkflowStep: s.setCurrentWorkflowStep,
      markWorkflowStepComplete: s.markWorkflowStepComplete,
    }))
  )

  const prevSectionStatus = useRef(sectionStatus)
  const restoredRef = useRef(false)

  useEffect(() => {
    syncWorkflowFromPipeline()
  }, [sectionStatus, generationStep, isComplete, syncWorkflowFromPipeline])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    applyWorkflowHashFromLocation()

    if (typeof window !== 'undefined' && window.location.hash) return

    const session = loadWorkflowSession()
    if (session?.lastVisitedStep) {
      navigateToStep(session.lastVisitedStep)
      setCurrentWorkflowStep(session.lastVisitedStep)
    } else if (session?.currentWorkflowStep) {
      setCurrentWorkflowStep(session.currentWorkflowStep)
    }
  }, [setCurrentWorkflowStep])

  useEffect(() => {
    const prev = prevSectionStatus.current
    prevSectionStatus.current = sectionStatus

    for (const [section, status] of Object.entries(sectionStatus)) {
      const prevStatus = prev[section as keyof typeof prev]
      if (prevStatus === 'completed' || status !== 'completed') continue

      const completedStep = findMissionStepForSection(section)
      if (!completedStep) continue

      markWorkflowStepComplete(completedStep)

      const next = nextMissionStep(completedStep)
      if (!next) continue

      window.setTimeout(() => {
        navigateToStep(next.id as WorkflowStepId)
        setCurrentWorkflowStep(next.id as WorkflowStepId)
      }, 320)
    }
  }, [sectionStatus, markWorkflowStepComplete, setCurrentWorkflowStep])

  const continuityInput = {
    sectionStatus,
    generationStep,
    isComplete,
    hook,
    script,
    scenesCount: scenes.length,
    voiceUrl,
    exportPackageReady,
    videoUrl,
  }

  const showMissionComplete = isExportMissionComplete(continuityInput)
  const nextIncomplete = inferNextIncompleteStackedStep(continuityInput)
  const showContinueCta =
    !isGenerating &&
    !showMissionComplete &&
    nextIncomplete &&
    nextIncomplete.id !== currentWorkflowStep

  return (
    <div className={cn('space-y-2', className)}>
      <AnimatePresence>
        {showMissionComplete ? (
          <motion.div
            key="mission-complete"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MissionCompleteBanner />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showContinueCta && nextIncomplete ? (
        <button
          type="button"
          onClick={() => {
            navigateToStep(nextIncomplete.id)
            setCurrentWorkflowStep(nextIncomplete.id)
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            'text-[10px] font-semibold tracking-[0.14em] uppercase',
            'border border-gold-500/25 text-gold-200/90',
            'hover:bg-gold-500/[0.08] hover:border-gold-500/40 transition-colors'
          )}
        >
          {continueCtaLabel(nextIncomplete)}
          <ArrowRight className="w-3 h-3" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

function findMissionStepForSection(section: string): WorkflowStepId | null {
  const map: Record<string, WorkflowStepId> = {
    contentDirectorBrief: 'angle',
    hook: 'hook',
    script: 'script',
    captions: 'script',
    visualDirection: 'scenes',
    storyboard: 'visuals',
    thumbnail: 'visuals',
    voice: 'voice',
    export: 'export',
  }
  return map[section] ?? null
}
