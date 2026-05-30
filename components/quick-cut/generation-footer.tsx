'use client'

import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { RenderProgress } from '@/components/quick-cut/render-progress'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Bottom padding for scrollable content so it clears the fixed generation footer. */
export const GENERATION_FOOTER_CLEARANCE = 'pb-44 sm:pb-48'

export function QuickCutGenerationFooter({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  const subtitle = hook
    ? 'Hook ready — open Hook tab'
    : generationStep === 'title' || generationStep === 'analyzing'
      ? 'Generating hook…'
      : isComplete
        ? 'Production complete'
        : 'In production…'

  return (
    <footer
      className={cn(
        'fixed bottom-0 inset-x-0 z-40',
        'border-t border-gold-500/15 bg-black/85 backdrop-blur-xl',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className
      )}
      aria-label="Generation progress"
    >
      <div
        className={cn(
          'max-w-6xl mx-auto',
          'px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          'py-3 sm:py-4 space-y-3 sm:space-y-4'
        )}
      >
        {title ? (
          <CinematicTitleReveal
            title={title}
            subtitle={subtitle}
            className="!text-left items-start !space-y-1"
          />
        ) : null}
        <RenderProgress />
      </div>
    </footer>
  )
}
