'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicViewingBreathing({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('emotional-playback-breathing', className)} style={{ animationDuration: '4s' }}>
      {children}
    </div>
  )
}

export function EmotionalPlaybackPulse({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-premiere-opacity', className)}>{children}</div>
}

export function ShowcasePresenceFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('viewing-atmosphere-opacity', className)} style={{ animationDuration: '320ms' }}>
      {children}
    </div>
  )
}

export function CinematicViewingOpacity({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-premiere-opacity', className)}>{children}</div>
}
