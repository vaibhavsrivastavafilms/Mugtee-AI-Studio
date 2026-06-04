'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  Clapperboard,
  Download,
  FileText,
  Lightbulb,
  Mic,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { glassPanel } from '@/components/home/cinematic-home-styles'

const PIPELINE_STEPS: {
  label: string
  short?: string
  icon: typeof Lightbulb
}[] = [
  { label: 'Idea', icon: Lightbulb },
  { label: 'Hook', icon: Zap },
  { label: 'Script', icon: FileText },
  { label: 'Visual Direction', short: 'Visuals', icon: Palette },
  { label: 'Storyboard', icon: Clapperboard },
  { label: 'Voice', icon: Mic },
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
        'flex min-h-0 min-w-0 flex-col items-center justify-center',
        className
      )}
    >
      <div
        className={cn(
          glassPanel,
          'relative flex min-h-0 w-full max-w-[11rem] xl:max-w-[12rem] flex-col px-3 py-4',
          !isVertical && 'max-w-none flex-row items-center gap-1 px-4 py-3'
        )}
      >
        <div className="mb-2 flex items-center justify-center gap-1 text-[8px] tracking-[0.24em] uppercase text-[#D4AF37]/80 lg:hidden">
          <Sparkles className="h-3 w-3" aria-hidden />
          Pipeline
        </div>

        <div
          className={cn(
            'flex min-h-0 flex-1',
            isVertical
              ? 'flex-col items-stretch justify-between gap-1'
              : 'flex-row items-center justify-between gap-0.5 overflow-x-auto'
          )}
        >
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon
            const active = i === 3
            return (
              <div
                key={step.label}
                className={cn(
                  'relative flex items-center',
                  isVertical ? 'flex-row gap-2' : 'flex-col gap-0.5 min-w-[52px]'
                )}
              >
                {i > 0 && isVertical ? (
                  <span
                    className="absolute -top-1 left-[18px] h-1 w-px bg-gradient-to-b from-[#D4AF37]/40 to-transparent"
                    aria-hidden
                  />
                ) : null}
                <motion.div
                  initial={stepInitial}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-lg border transition-colors',
                    isVertical ? 'h-8 w-8' : 'h-7 w-7',
                    active
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                      : 'border-white/10 bg-black/40'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      active ? 'text-[#E8C547]' : 'text-white/45'
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    'uppercase tracking-[0.12em] leading-tight',
                    isVertical
                      ? 'text-[9px] text-white/50'
                      : 'text-[7px] text-center text-white/45 max-w-[56px]',
                    active && 'text-[#D4AF37]'
                  )}
                >
                  {!isVertical && step.short ? step.short : step.label}
                </span>
                {i < PIPELINE_STEPS.length - 1 && !isVertical ? (
                  <span
                    className="hidden sm:block absolute -right-1 top-1/2 h-px w-2 bg-[#D4AF37]/25"
                    aria-hidden
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
})
