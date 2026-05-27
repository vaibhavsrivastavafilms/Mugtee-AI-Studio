'use client'

import { useMemo } from 'react'
import { getSelectiveEvolutionMarker } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function SelectiveEvolutionMarker({
  visible,
  seed = 0,
  className,
}: {
  visible?: boolean
  seed?: number
  className?: string
}) {
  const marker = useMemo(() => getSelectiveEvolutionMarker(seed), [seed])

  if (visible === false) return null

  return (
    <span
      className={cn(
        'text-[8px] tracking-[0.16em] uppercase text-white/28',
        className
      )}
      aria-hidden
    >
      {marker}
    </span>
  )
}
