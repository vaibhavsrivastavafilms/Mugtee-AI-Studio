'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicViewingFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-viewing-focus cinematic-presentation-weight', className)}>
      {children}
    </div>
  )
}

export function CinematicPremiereEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative cinematic-showcase-layer visual-premiere-opacity', className)}>
      {children}
    </div>
  )
}

/** Class-only — no stacked overlay visuals. */
export function EmotionalViewingOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-showcase-layer', className)}>{children}</div>
}

export function VisualShowcaseAtmosphere({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-showcase-depth', className)}>{children}</div>
}

export function CinematicPresentationComposition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-viewing-depth', className)}>{children}</div>
}

export function CinematicViewingOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('viewing-atmosphere-opacity', className)}>{children}</div>
}

export function VisualShowcaseDepth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-showcase-depth', className)}>{children}</div>
}

export function CinematicPremiereLayerShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-showcase-layer', className)}>{children}</div>
}
