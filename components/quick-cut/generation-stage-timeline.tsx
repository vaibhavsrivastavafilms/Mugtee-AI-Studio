'use client'

import { Check, Circle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ProgressStageStatus } from '@/lib/quick-cut/cinematic-generation-progress'
import { cn } from '@/lib/utils'

export type StageTimelineItem = {
  id: string
  label: string
  status: ProgressStageStatus
}

type GenerationStageTimelineProps = {
  stages: StageTimelineItem[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

function StageNode({ status }: { status: ProgressStageStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-300">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    )
  }
  if (status === 'current') {
    return (
      <motion.span
        animate={{ boxShadow: ['0 0 0 0 rgba(212,175,55,0.35)', '0 0 0 6px rgba(212,175,55,0)', '0 0 0 0 rgba(212,175,55,0.35)'] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#D4AF37]/15 text-gold-200"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      </motion.span>
    )
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] bg-black/40 text-luxe/30">
      <Circle className="h-3 w-3" aria-hidden />
    </span>
  )
}

export function GenerationStageTimeline({
  stages,
  className,
  orientation = 'horizontal',
}: GenerationStageTimelineProps) {
  if (orientation === 'vertical') {
    return (
      <ul className={cn('space-y-2', className)}>
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-2.5">
            <StageNode status={stage.status} />
            <span
              className={cn(
                'text-[11px]',
                stage.status === 'completed' && 'text-emerald-200/80',
                stage.status === 'current' && 'text-gold-100/90',
                stage.status === 'pending' && 'text-luxe/40'
              )}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className={cn('overflow-x-auto scrollbar-luxe', className)}>
      <ol className="flex items-center gap-1 min-w-max py-1">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1 px-1">
              <StageNode status={stage.status} />
              <span
                className={cn(
                  'text-[9px] tracking-wide whitespace-nowrap',
                  stage.status === 'completed' && 'text-emerald-200/75',
                  stage.status === 'current' && 'text-gold-100/90',
                  stage.status === 'pending' && 'text-luxe/35'
                )}
              >
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 ? (
              <span
                className={cn(
                  'h-px w-4 sm:w-6 mb-4 shrink-0',
                  stage.status === 'completed' ? 'bg-emerald-500/35' : 'bg-white/[0.08]'
                )}
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
