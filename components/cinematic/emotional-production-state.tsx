'use client'

import { useMemo } from 'react'
import { getEmotionalProductionState } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function EmotionalProductionState({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getEmotionalProductionState(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/48 production-continuity-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
