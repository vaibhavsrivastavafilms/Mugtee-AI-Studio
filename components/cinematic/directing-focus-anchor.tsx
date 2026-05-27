'use client'

import { useMemo } from 'react'
import { getFocusAnchorLine } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function DirectingFocusAnchor({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getFocusAnchorLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50 text-center cinematic-flow-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
