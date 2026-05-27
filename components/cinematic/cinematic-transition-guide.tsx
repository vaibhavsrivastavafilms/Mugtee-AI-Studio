'use client'

import { useMemo } from 'react'
import { getCinematicTransitionGuide } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function CinematicTransitionGuide({
  sceneIndex,
  totalScenes,
  style,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  className?: string
}) {
  const guide = useMemo(
    () => getCinematicTransitionGuide(sceneIndex, totalScenes, style),
    [sceneIndex, totalScenes, style]
  )

  if (!guide) return null

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/25 mt-1',
        className
      )}
      aria-hidden
    >
      {guide}
    </p>
  )
}
