'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicShowcaseFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-showcase-focus cinematic-premiere-weight', className)}>
      {children}
    </div>
  )
}

export function ImmersiveViewingComposition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-presentation-depth', className)}>{children}</div>
}

export function EmotionalShowcaseOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('presentation-atmosphere-opacity', className)}>{children}</div>
}

export function VisualPremiereEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-sharing-layer', className)}>{children}</div>
}

export function CinematicPresentationDepth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('cinematic-showcase-depth', className)}>{children}</div>
}

export function CinematicShowcaseOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('presentation-atmosphere-opacity', className)}>{children}</div>
}

export function VisualSharingDepth({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('visual-sharing-opacity', className)}>{children}</div>
}
