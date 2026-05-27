'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Single frame class for storyboard body — no gallery/archive styling. */
export function CinematicLegacyFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative authored-world-focus cinematic-memory-depth', className)}>
      {children}
    </div>
  )
}
