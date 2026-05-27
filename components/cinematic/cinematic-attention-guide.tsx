'use client'

import { useMemo } from 'react'
import { getAttentionGuideLine } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function CinematicAttentionGuide({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getAttentionGuideLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/30 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {line}
    </p>
  )
}
