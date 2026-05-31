'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import {
  MISSION_STEPS,
  resolveMissionStepState,
  type MissionStepState,
} from '@/lib/mission/mission-steps'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

function StepIcon({ state }: { state: MissionStepState }) {
  if (state === 'completed') {
    return (
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[var(--v2-gold)] text-xs"
      >
        ✓
      </motion.span>
    )
  }
  if (state === 'in_progress') {
    return <span className="text-[var(--v2-gold)] text-xs animate-spin inline-block">⟳</span>
  }
  return <span className="text-[var(--v2-text-secondary)] text-xs">○</span>
}

export function MissionTimeline({
  sectionStatus,
  generationStep,
  className,
  compact = false,
  horizontal = false,
}: {
  sectionStatus: SectionStatusMap
  generationStep: QuickCutGenerationStep
  className?: string
  compact?: boolean
  horizontal?: boolean
}) {
  const list = (
    <ul
      className={cn(
        horizontal
          ? 'flex gap-2 min-w-max'
          : cn(
              'grid gap-2',
              compact
                ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-9'
                : 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-9'
            )
      )}
    >
        {MISSION_STEPS.map((step) => {
          const state = resolveMissionStepState(step, sectionStatus, generationStep)
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-300',
                state === 'completed' && 'border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/[0.06]',
                state === 'in_progress' && 'border-[var(--v2-gold)]/50 bg-[var(--v2-gold)]/[0.1]',
                state === 'pending' && 'border-white/[0.06] bg-black/20'
              )}
            >
              <StepIcon state={state} />
              <span
                className={cn(
                  'text-[9px] tracking-[0.12em] uppercase leading-tight',
                  state === 'pending'
                    ? 'text-[var(--v2-text-secondary)]'
                    : 'text-[var(--v2-gold)]'
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
    </ul>
  )

  if (horizontal) {
    return (
      <div className={cn('w-full overflow-x-auto scrollbar-none -mx-1 px-1', className)}>
        {list}
      </div>
    )
  }

  return <div className={cn('w-full', className)}>{list}</div>
}
