'use client'

import { QuickCutStudio } from '@/components/quick-cut/quick-cut-studio'
import { CinematicCanvasBackground } from '@/components/quick-cut/canvas/cinematic-canvas-background'
import { AgentWorkflowStrip } from '@/components/agent/agent-workflow-strip'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { cn } from '@/lib/utils'

export function LiveGenerationCanvas({
  onRegenerate,
  embedded = false,
  complete = false,
  className,
}: {
  onRegenerate?: () => void
  embedded?: boolean
  complete?: boolean
  className?: string
}) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        embedded ? 'min-h-[calc(100dvh-4rem)]' : 'min-h-[100dvh]',
        className
      )}
    >
      <CinematicCanvasBackground />

      <div className="relative z-10 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto min-w-0 w-full overflow-x-hidden">
          {!complete && generationStep !== 'idle' && generationStep !== 'complete' ? (
            <div className="mb-4 flex justify-center">
              <AgentWorkflowStrip generationStep={generationStep} />
            </div>
          ) : null}

          <QuickCutStudio onRegenerate={onRegenerate} />
        </div>
      </div>
    </div>
  )
}
