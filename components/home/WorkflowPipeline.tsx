'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  AudioLines,
  Download,
  FileText,
  LayoutGrid,
  Lightbulb,
  Palette,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PIPELINE_STEPS: {
  label: string
  short?: string
  icon: typeof Lightbulb
}[] = [
  { label: 'Idea', icon: Lightbulb },
  { label: 'Hook', icon: Zap },
  { label: 'Script', icon: FileText },
  { label: 'Visual Direction', short: 'Visual', icon: Palette },
  { label: 'Storyboard', icon: LayoutGrid },
  { label: 'Voice', icon: AudioLines },
  { label: 'Export', icon: Download },
]

type WorkflowPipelineProps = {
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export const WorkflowPipeline = memo(function WorkflowPipeline({
  className,
  orientation = 'vertical',
}: WorkflowPipelineProps) {
  const stepInitial = useCinematicMotionInitial({ opacity: 0, scale: 0.92 })
  const isVertical = orientation === 'vertical'

  return (
    <section
      id="workflow"
      aria-label="Production workflow"
      className={cn(
        'flex min-h-0 min-w-0 flex-col items-center justify-center px-1',
        className
      )}
    >
      <div
        className={cn(
          'relative flex min-h-0 w-full',
          isVertical
            ? 'flex-col items-center justify-center gap-0 py-2'
            : 'flex-row items-center justify-between gap-0.5 overflow-x-auto rounded-2xl border border-[#D4AF37]/12 bg-white/[0.02] px-3 py-2'
        )}
      >
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.label}
              className={cn(
                'relative flex items-center',
                isVertical ? 'flex-col gap-1 py-1.5' : 'flex-col gap-0.5 min-w-[48px] py-1'
              )}
            >
              {i > 0 ? (
                <span
                  className={cn(
                    'absolute bg-[#D4AF37]/35',
                    isVertical
                      ? '-top-2 left-1/2 h-2 w-px -translate-x-1/2 border-l border-dashed border-[#D4AF37]/40'
                      : '-left-1 top-1/2 h-px w-2 -translate-y-1/2 hidden sm:block'
                  )}
                  style={
                    isVertical
                      ? {
                          background:
                            'repeating-linear-gradient(180deg, rgba(212,175,55,0.5) 0 3px, transparent 3px 6px)',
                        }
                      : undefined
                  }
                  aria-hidden
                />
              ) : null}
              <motion.div
                initial={stepInitial}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 shadow-[0_0_14px_rgba(212,175,55,0.2)]',
                  isVertical ? 'h-9 w-9' : 'h-7 w-7'
                )}
              >
                <Icon className="h-3.5 w-3.5 text-[#E8C547]" />
              </motion.div>
              <span
                className={cn(
                  'uppercase tracking-[0.1em] leading-tight text-[#D4AF37]/80',
                  isVertical ? 'text-[8px] text-center max-w-[72px]' : 'text-[7px] text-center max-w-[52px]'
                )}
              >
                {!isVertical && step.short ? step.short : step.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
})
