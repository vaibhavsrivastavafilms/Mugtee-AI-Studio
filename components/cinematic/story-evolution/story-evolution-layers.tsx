'use client'

import type { ReactNode } from 'react'
import { CinematicUniverseOverlay } from '@/components/cinematic/story-evolution/story-evolution-frame'
import { cn } from '@/lib/utils'

/** Phase 4.3 — class-only continuity layer. */
export function CinematicStorytellingContinuityLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative narrative-continuity-depth', className)}>
      {children}
    </div>
  )
}

/** Phase 4.3 narrative engine alias. */
export function CinematicNarrativeEngine({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CinematicStorytellingContinuityLayer className={className}>{children}</CinematicStorytellingContinuityLayer>
}

/** Phase 4.4 — class-only identity layer. */
export function CinematicStorytellingIdentityLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative storytelling-identity-depth', className)}>
      {children}
    </div>
  )
}

/** Phase 4.5 — class-only universe layer. */
export function CinematicStoryUniverseLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <CinematicUniverseOverlay className={cn('cinematic-universe-layer', className)}>
      {children}
    </CinematicUniverseOverlay>
  )
}

/** Phase 4.5 universe engine alias. */
export function CinematicUniverseEngine({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CinematicStoryUniverseLayer className={className}>{children}</CinematicStoryUniverseLayer>
}

/** Phase 5 — class-only operating layer. */
export function CinematicStorytellingOperatingLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative story-operating-layer immersive-storytelling-environment', className)}>
      {children}
    </div>
  )
}

/** Phase 5 operating engine alias. */
export function CinematicOperatingEngine({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CinematicStorytellingOperatingLayer className={className}>{children}</CinematicStorytellingOperatingLayer>
}
