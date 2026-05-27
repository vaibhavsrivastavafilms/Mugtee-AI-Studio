'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicStoryFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-sequence-focus story-experience-depth', className)}>
      {children}
    </div>
  )
}

export function CinematicStoryAtmosphere({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('story-experience-layer', className)}>{children}</div>
}

export function EmotionalImmersionOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('narrative-immersion-opacity', className)}>{children}</div>
}

export function CinematicViewingDepthShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('story-experience-depth', className)}>{children}</div>
}

export function ImmersiveStoryPresence({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('immersive-narrative-focus', className)}>{children}</div>
}

export function CinematicUniverseOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-universe-layer', className)}>{children}</div>
}

export function EmotionalStoryworldDepth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('emotional-universe-depth', className)}>{children}</div>
}

export function CinematicStorytellingOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('story-operating-layer', className)}>{children}</div>
}

export function ImmersiveCinematicEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('immersive-storytelling-environment', className)}>{children}</div>
}

export function ImmersiveNarrativeViewer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-narrative-focus narrative-immersion-opacity', className)}>
      {children}
    </div>
  )
}
