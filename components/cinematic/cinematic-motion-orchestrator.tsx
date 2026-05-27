'use client'

import type { ReactNode } from 'react'
import { EmotionalAtmosphereBreathing } from '@/components/cinematic/emotional-atmosphere-breathing'
import { CinematicLifeLayer } from '@/components/cinematic/cinematic-life-layer'
import { cn } from '@/lib/utils'

export function CinematicMotionOrchestrator({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <EmotionalAtmosphereBreathing />
      <CinematicLifeLayer className="opacity-40" />
      {children}
    </div>
  )
}
