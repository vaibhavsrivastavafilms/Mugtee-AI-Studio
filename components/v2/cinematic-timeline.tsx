'use client'

import { cn } from '@/lib/utils'
import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'

const STEPS = [
  { id: 'analyzing', label: 'Analyze', section: null as keyof SectionStatusMap | null },
  { id: 'script', label: 'Script', section: 'script' as const },
  { id: 'scenes', label: 'Scenes', section: 'visualDirection' as const },
  { id: 'visuals', label: 'Visuals', section: 'storyboard' as const },
  { id: 'voice', label: 'Voice', section: 'voice' as const },
  { id: 'render', label: 'Reel', section: 'export' as const },
] as const

const STEP_ORDER = STEPS.map((s) => s.id)

export function CinematicTimeline({
  currentStep,
  sectionStatus,
  className,
}: {
  currentStep: string
  sectionStatus?: SectionStatusMap
  className?: string
}) {
  const currentIndex = STEP_ORDER.indexOf(currentStep as (typeof STEP_ORDER)[number])
  const activeIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const sectionDone =
            step.section && sectionStatus?.[step.section] === 'completed'
          const done = sectionDone || i < activeIndex
          const active =
            !sectionDone &&
            (i === activeIndex ||
              (step.section && sectionStatus?.[step.section] === 'generating'))
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
                  done || active ? 'text-[var(--v2-gold)]' : 'text-[var(--v2-text-secondary)]'
                )}
              >
                {sectionDone && step.section
                  ? `${step.label} ✓`
                  : step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
