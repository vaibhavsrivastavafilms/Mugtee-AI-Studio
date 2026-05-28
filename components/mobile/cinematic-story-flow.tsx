'use client'

import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buildEmotionalScrollRhythm } from '@/lib/mobile/emotional-scroll-rhythm'
import { optimizeAtmosphereRender } from '@/lib/cinematic/execution/cinematic-performance-engine'

export function CinematicStoryFlow({
  children,
  segmentCount = 3,
  durationSec = 30,
  className,
}: {
  children: ReactNode
  segmentCount?: number
  durationSec?: number
  className?: string
}) {
  const { preferReducedLayers } = optimizeAtmosphereRender()
  const rhythm = useMemo(
    () => buildEmotionalScrollRhythm(segmentCount, durationSec, preferReducedLayers),
    [segmentCount, durationSec, preferReducedLayers]
  )

  return (
    <div
      className={cn(
        'cinematic-story-flow flex flex-col gap-6 sm:gap-8',
        preferReducedLayers && 'cinematic-reduced-layers',
        className
      )}
      data-segments={rhythm.length}
    >
      {children}
    </div>
  )
}
