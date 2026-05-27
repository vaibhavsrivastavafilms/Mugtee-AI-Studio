'use client'

import { useMemo } from 'react'
import { getVisualProductionContinuity } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function VisualProductionContinuity({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualProductionContinuity(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28 text-center',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
