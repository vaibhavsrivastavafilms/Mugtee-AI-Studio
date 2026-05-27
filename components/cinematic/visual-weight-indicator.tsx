'use client'

import { useMemo } from 'react'
import { getVisualWeightIndicator } from '@/lib/creator/pacing-intelligence'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function VisualWeightIndicator({
  scene,
  totalScenes,
  className,
}: {
  scene: Pick<CinematicScene, 'emotion' | 'duration' | 'index'>
  totalScenes: number
  className?: string
}) {
  const label = useMemo(
    () => getVisualWeightIndicator(scene, totalScenes),
    [scene, totalScenes]
  )

  return (
    <span
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30',
        className
      )}
      aria-hidden
    >
      {label}
    </span>
  )
}
