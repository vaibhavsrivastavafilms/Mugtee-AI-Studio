'use client'

import { useMemo } from 'react'
import { getDirectingMomentumTrack } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function DirectingMomentumTrack({
  sceneCount,
  seed = 0,
  className,
}: {
  sceneCount: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getDirectingMomentumTrack(sceneCount, seed),
    [sceneCount, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50 cinematic-world-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
