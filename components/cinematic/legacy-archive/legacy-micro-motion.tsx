'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicMemoryBreathing({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('emotional-presence-breathing', className)}>{children}</div>
  )
}

export function LegacyAtmosphereFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('legacy-atmosphere-opacity', className)} style={{ animationDuration: '320ms' }}>
      {children}
    </div>
  )
}

export function CinematicPreservationOpacity({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('visual-memory-opacity', className)}>{children}</div>
  )
}

export function EmotionalPresenceEcho({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('legacy-atmosphere-opacity', className)}>{children}</div>
  )
}
