'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import {
  MISSION_STEPS,
  resolveMissionStepState,
  type MissionStepState,
} from '@/lib/mission/mission-steps'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { isStageTabReachable } from '@/lib/cinematic/quick-cut/stage-tabs'
import type { WorkflowStepId } from '@/lib/workflow/workflow-step-map'
import { WORKFLOW_STEP_TO_TAB } from '@/lib/workflow/workflow-step-map'
import { navigateToStep } from '@/lib/workflow/workflow-navigation'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function StepMarker({ state }: { state: MissionStepState }) {
  if (state === 'completed') {
    return (
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-gold-300 text-[11px] leading-none"
        aria-hidden
      >
        ✓
      </motion.span>
    )
  }
  if (state === 'in_progress') {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse"
        aria-hidden
      />
    )
  }
  return (
    <span className="text-luxe/25 text-[11px] leading-none" aria-hidden>
      ○
    </span>
  )
}

type WorkflowTimelineProps = {
  sectionStatus: SectionStatusMap
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  currentWorkflowStep: WorkflowStepId
  className?: string
}

export function WorkflowTimeline({
  sectionStatus,
  generationStep,
  isComplete,
  currentWorkflowStep,
  className,
}: WorkflowTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    const active = activeButtonRef.current
    if (!container || !active) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const offset =
      activeRect.left -
      containerRect.left -
      containerRect.width / 2 +
      activeRect.width / 2

    container.scrollTo({
      left: container.scrollLeft + offset,
      behavior: 'smooth',
    })
  }, [currentWorkflowStep])

  return (
    <nav aria-label="Creator workflow timeline" className={cn('w-full', className)}>
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-1 px-1"
      >
        <ol className="flex items-center gap-0 min-w-max py-0.5">
          {MISSION_STEPS.map((step, index) => {
            const state = resolveMissionStepState(step, sectionStatus, generationStep)
            const stepTab = WORKFLOW_STEP_TO_TAB[step.id as WorkflowStepId]
            const reachable = stepTab
              ? isStageTabReachable(stepTab, generationStep, isComplete)
              : false
            const isSelected = currentWorkflowStep === step.id
            const isCurrent = state === 'in_progress' || isSelected
            const isDone = state === 'completed'

            return (
              <li key={step.id} className="flex items-center snap-center">
                <button
                  ref={isSelected ? activeButtonRef : undefined}
                  type="button"
                  disabled={!reachable && !isComplete && state === 'pending'}
                  onClick={() => {
                    navigateToStep(step.id as WorkflowStepId)
                    useQuickCutGenerationStore.getState().setCurrentWorkflowStep(step.id as WorkflowStepId)
                  }}
                  aria-current={isSelected ? 'step' : undefined}
                  className={cn(
                    'group inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all duration-300 snap-center',
                    'text-[9px] sm:text-[10px] tracking-[0.1em] uppercase whitespace-nowrap',
                    'disabled:cursor-not-allowed',
                    isCurrent &&
                      'text-gold-100 shadow-[0_0_20px_rgba(212,175,55,0.18)] bg-gold-500/[0.08] ring-1 ring-gold-500/25',
                    isSelected && !isCurrent && 'text-gold-200/90 bg-white/[0.04]',
                    isDone && !isSelected && !isCurrent && 'text-gold-300/75',
                    !isDone && !isCurrent && !isSelected && 'text-luxe/35 opacity-70',
                    reachable &&
                      'hover:text-gold-200 hover:bg-gold-500/[0.06] hover:shadow-[0_0_16px_rgba(212,175,55,0.12)]',
                    !reachable && !isComplete && state === 'pending' && 'opacity-40'
                  )}
                >
                  <StepMarker state={state} />
                  <span>{step.label}</span>
                </button>
                {index < MISSION_STEPS.length - 1 ? (
                  <span
                    className="mx-0.5 text-luxe/20 text-[10px] select-none"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
