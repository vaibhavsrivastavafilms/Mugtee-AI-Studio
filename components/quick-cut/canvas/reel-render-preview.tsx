'use client'

import { ExportPreview } from '@/components/quick-cut/export-preview'
import { CinematicCanvasBackground } from '@/components/quick-cut/canvas/cinematic-canvas-background'
import { cn } from '@/lib/utils'

export function ReelRenderPreview({
  onRegenerate,
  embedded = false,
  className,
}: {
  onRegenerate?: () => void
  embedded?: boolean
  className?: string
}) {
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
        <div className="max-w-lg mx-auto">
          <ExportPreview onRegenerate={onRegenerate} />
        </div>
      </div>
    </div>
  )
}
