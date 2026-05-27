'use client'

import { useMemo } from 'react'
import { getRhythmPresenceLine } from '@/lib/creator/master-cinematic-copy'
import { cn } from '@/lib/utils'

export function CreatorRhythmPresence({
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
    () => getRhythmPresenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/42 text-center cinematic-world-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
