'use client'

import { cn } from '@/lib/utils'
import { optimizeAtmosphereRender } from '@/lib/cinematic/execution/cinematic-performance-engine'
import { CinematicStoryFlow } from '@/components/mobile/cinematic-story-flow'

export function CinematicMobileMode({
  children,
  className,
  segmentCount,
  durationSec,
}: {
  children: React.ReactNode
  className?: string
  segmentCount?: number
  durationSec?: number
}) {
  const { preferReducedLayers } = optimizeAtmosphereRender()

  return (
    <div
      className={cn(
        'cinematic-mobile-mode cinematic-touch-flow min-h-[100dvh] overscroll-y-contain touch-manipulation',
        'px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]',
        'pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]',
        'max-sm:[&_.immersive-film-viewer]:min-h-[min(68dvh,520px)] max-sm:[&_.cinematic-export-frame]:aspect-[9/16]',
        'max-sm:[&_.immersive-scene-scroll]:-mx-1 max-sm:[&_button]:min-h-[44px]',
        'max-sm:[&_.immersive-film-viewer_.calm-opacity-transition]:duration-[420ms]',
        segmentCount != null && segmentCount >= 10 && 'max-sm:[&_.immersive-scene-scroll]:max-h-[min(76dvh,680px)]',
        preferReducedLayers && 'cinematic-reduced-layers',
        className
      )}
    >
      <CinematicStoryFlow segmentCount={segmentCount} durationSec={durationSec}>
        {children}
      </CinematicStoryFlow>
    </div>
  )
}
