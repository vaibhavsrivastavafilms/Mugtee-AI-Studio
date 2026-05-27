'use client'

import { useMemo } from 'react'
import { getContinuityMemoryLine } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function ContinuityMemoryLine({
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
    () => getContinuityMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50 text-center calm-opacity-transition',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
