'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'analyzing', label: 'Analyze' },
  { id: 'script', label: 'Script' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'visuals', label: 'Visuals' },
  { id: 'voice', label: 'Voice' },
  { id: 'render', label: 'Reel' },
] as const

const STEP_ORDER = STEPS.map((s) => s.id)

export function CinematicTimeline({
  currentStep,
  className,
}: {
  currentStep: string
  className?: string
}) {
  const currentIndex = STEP_ORDER.indexOf(currentStep as (typeof STEP_ORDER)[number])
  const activeIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const done = i < activeIndex
          const active = i === activeIndex
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={cn(
                  'h-1 w-full rounded-full transition-all duration-300',
                  done && 'bg-[var(--v2-gold)]',
                  active && 'bg-[var(--v2-gold)]/60 animate-pulse',
                  !done && !active && 'bg-white/[0.08]'
                )}
              />
              <span
                className={cn(
                  'text-[9px] tracking-[0.18em] uppercase hidden sm:block',
                  active ? 'text-[var(--v2-gold)]' : 'text-[var(--v2-text-secondary)]'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
