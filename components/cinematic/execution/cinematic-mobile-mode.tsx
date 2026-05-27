'use client'

import { cn } from '@/lib/utils'
import { optimizeAtmosphereRender } from '@/lib/cinematic/execution/cinematic-performance-engine'

export function CinematicMobileMode({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { preferReducedLayers } = optimizeAtmosphereRender()

  return (
    <div
      className={cn(
        'cinematic-mobile-mode cinematic-touch-flow',
        preferReducedLayers && 'cinematic-reduced-layers',
        className
      )}
    >
      {children}
    </div>
  )
}
