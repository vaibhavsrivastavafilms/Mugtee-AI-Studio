'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicBreathingOpacity({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('cinematic-flow-opacity', className)}>{children}</div>
  )
}

export function EmotionalPresenceFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('continuity-preservation-fade', className)}>{children}</div>
  )
}

export function FlowStatePulse({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-1 h-1 rounded-full bg-[#D4AF37]/40 flow-state-pulse',
        className
      )}
      aria-hidden
    />
  )
}

export function ImmersiveGuidanceLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative pacing-awareness-glow rounded-xl', className)}>
      {children}
    </div>
  )
}
