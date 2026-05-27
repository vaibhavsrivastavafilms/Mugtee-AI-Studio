'use client'

import { useMemo } from 'react'
import { getDirectingRhythmState } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function DirectingRhythmState({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getDirectingRhythmState(style, niche),
    [style, niche]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28 emotional-rhythm-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
