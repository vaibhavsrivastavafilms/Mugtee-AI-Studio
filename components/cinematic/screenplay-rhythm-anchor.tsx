'use client'

import { useMemo } from 'react'
import { getScreenplayRhythmAnchor } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function ScreenplayRhythmAnchor({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const anchor = useMemo(() => getScreenplayRhythmAnchor(seed), [seed])

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.22em] uppercase text-white/28 border-t border-white/[0.04] pt-4 mt-6 screenplay-flow-spacing',
        className
      )}
      role="status"
    >
      {anchor}
    </p>
  )
}
