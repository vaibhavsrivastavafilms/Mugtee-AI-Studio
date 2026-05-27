'use client'

import { useMemo } from 'react'
import { getNarrativeFlowMarker } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function NarrativeFlowMarker({
  sceneIndex,
  totalScenes,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  className?: string
}) {
  const marker = useMemo(
    () => getNarrativeFlowMarker(sceneIndex, totalScenes),
    [sceneIndex, totalScenes]
  )

  return (
    <span
      className={cn(
        'text-[8px] tracking-[0.22em] uppercase text-white/28',
        className
      )}
      aria-hidden
    >
      {marker}
    </span>
  )
}
