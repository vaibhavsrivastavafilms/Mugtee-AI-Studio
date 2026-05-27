'use client'

import type { ReactNode } from 'react'
import { CinematicEnvironmentDepth } from '@/components/cinematic/cinematic-environment-depth'
import { DirectingSpatialLayer } from '@/components/cinematic/directing-spatial-layer'
import { VisualCompositionOverlay } from '@/components/cinematic/visual-composition-overlay'
import { AtmosphereBreathingLayer } from '@/components/cinematic/atmosphere-breathing-layer'
import { CinematicLifeLayer } from '@/components/cinematic/cinematic-life-layer'
import { cn } from '@/lib/utils'

export function DirectingEnvironmentComposer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative directing-environment-focus', className)}>
      <CinematicEnvironmentDepth />
      <DirectingSpatialLayer />
      <VisualCompositionOverlay />
      <AtmosphereBreathingLayer />
      <CinematicLifeLayer />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
