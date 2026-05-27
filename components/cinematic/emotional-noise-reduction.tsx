'use client'

import type { ReactNode } from 'react'
import { CinematicNoiseReducer } from '@/components/cinematic/cinematic-noise-reducer'
import { cn } from '@/lib/utils'

export function EmotionalNoiseReduction({
  children,
  focused = true,
  className,
}: {
  children: ReactNode
  focused?: boolean
  className?: string
}) {
  return (
    <CinematicNoiseReducer
      focused={focused}
      className={cn('cinematic-preservation-layer story-operating-layer live-final-os-depth', className)}
    >
      {children}
    </CinematicNoiseReducer>
  )
}
