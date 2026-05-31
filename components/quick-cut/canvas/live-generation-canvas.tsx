'use client'

import { QuickCutStudio } from '@/components/quick-cut/quick-cut-studio'
import { CinematicCanvasBackground } from '@/components/quick-cut/canvas/cinematic-canvas-background'
import { GenerationMissionPanel } from '@/components/mission/generation-mission-panel'
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
          <header className="mb-6 sm:mb-8 text-center">
            <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-2">
              {complete ? 'Production complete' : 'Creator mission'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)] italic">
              {complete ? 'Your reel is ready to export' : 'Mugtee is directing your next viral story.'}
            </h2>
            <div className="mt-6">
              <GenerationMissionPanel complete={complete} />
            </div>
            <AgentWorkflowStrip generationStep={generationStep} className="mt-4" />
          </header>

          <QuickCutStudio onRegenerate={onRegenerate} />
        </div>
      </div>
    </div>
  )
}
