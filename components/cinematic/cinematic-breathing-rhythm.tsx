'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicBreathingRhythm({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('emotional-rhythm-breathing cinematic-flow-opacity', className)}>
      {children}
    </div>
  )
}
