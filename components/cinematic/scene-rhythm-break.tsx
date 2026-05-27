'use client'

import { sceneRhythmLabel } from '@/lib/creator/output-presence'
import { cn } from '@/lib/utils'

export function SceneRhythmBreak({
  beatIndex,
  label,
  className,
}: {
  beatIndex: number
  label?: string
  className?: string
}) {
  const beatLabel = label ?? sceneRhythmLabel(beatIndex)

  return (
    <div
      className={cn('my-7 sm:my-8 flex items-center gap-3 calm-opacity-transition', className)}
      aria-hidden
    >
      <div className="h-px flex-1 cinematic-soft-divider opacity-80" />
      <span className="text-[8px] tracking-[0.28em] uppercase text-white/28 shrink-0 px-1">
        {beatLabel}
      </span>
      <div className="h-px flex-1 cinematic-soft-divider opacity-80" />
    </div>
  )
}
