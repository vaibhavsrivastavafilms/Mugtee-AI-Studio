'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { WorkflowStepId } from '@/lib/workflow/workflow-navigation'

type WorkflowSectionProps = {
  stepId: WorkflowStepId
  label: string
  isActive?: boolean
  isCompleted?: boolean
  className?: string
  children: React.ReactNode
}

export function WorkflowSection({
  stepId,
  label,
  isActive = false,
  isCompleted = false,
  className,
  children,
}: WorkflowSectionProps) {
  return (
    <motion.section
      id={stepId}
      data-workflow-section={stepId}
      initial={false}
      animate={
        isActive
          ? {
              boxShadow: '0 0 32px rgba(212,175,55,0.08)',
            }
          : { boxShadow: '0 0 0px rgba(212,175,55,0)' }
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'scroll-mt-28 rounded-xl border transition-colors duration-300',
        isActive
          ? 'border-gold-500/25 bg-gold-500/[0.03] ring-1 ring-gold-500/15'
          : isCompleted
            ? 'border-white/[0.08] bg-black/20'
            : 'border-white/[0.06] bg-black/15',
        className
      )}
      aria-labelledby={`workflow-section-${stepId}`}
    >
      <div className="px-3 sm:px-4 pt-3 pb-1 flex items-center gap-2">
        <span
          id={`workflow-section-${stepId}`}
          className={cn(
            'text-[9px] sm:text-[10px] tracking-[0.22em] uppercase',
            isActive ? 'text-gold-200' : isCompleted ? 'text-gold-300/70' : 'text-luxe/40'
          )}
        >
          {label}
        </span>
        {isActive ? (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="px-1 sm:px-2 pb-3">{children}</div>
    </motion.section>
  )
}
