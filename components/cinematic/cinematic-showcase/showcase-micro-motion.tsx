'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicShowcaseBreathing({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('emotional-showcase-breathing', className)} style={{ animationDuration: '4s' }}>
      {children}
    </div>
  )
}

export function EmotionalSharingPulse({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-sharing-opacity', className)}>{children}</div>
}

export function ShowcasePresenceFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('presentation-atmosphere-opacity', className)} style={{ animationDuration: '320ms' }}>
      {children}
    </div>
  )
}

export function CinematicPresentationOpacity({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-sharing-opacity', className)}>{children}</div>
}
