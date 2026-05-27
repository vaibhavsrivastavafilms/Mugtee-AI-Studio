'use client'

import { useMemo } from 'react'
import { getEmotionalProductionThread } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function EmotionalProductionThread({
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
    () => getEmotionalProductionThread(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28 text-center emotional-rhythm-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
