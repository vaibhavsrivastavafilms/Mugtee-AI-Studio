'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Global legacy class wrapper — no visual overlay, editorial calm only. */
export function CinematicLegacyOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('cinematic-preservation-layer legacy-atmosphere-opacity', className)}>
      {children}
    </div>
  )
}

export function CinematicLegacyAtmosphere({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('cinematic-archive-weight', className)}>{children}</div>
  )
}

export function VisualStoryworldDepth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-storyworld-depth', className)}>{children}</div>
}

export function CinematicMemoryComposition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-legacy-depth', className)}>{children}</div>
}
