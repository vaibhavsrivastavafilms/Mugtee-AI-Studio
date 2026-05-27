'use client'

import { useMemo } from 'react'
import { getProductionThreadLine } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function CinematicProductionThread({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getProductionThreadLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-white/32 text-center production-continuity-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
