'use client'

import type { ReactNode } from 'react'
import {
  ImmersiveFilmEnvironment,
  ImmersiveAudioEnvironment,
  ImmersiveFilmExperienceEnvironment,
  CinematicDistributionFrame,
  LiveStorytellingEcosystemFrame,
  FinalCinematicOperatingFrame,
} from '@/components/cinematic/live-cinematic/live-cinematic-frame'
import { cn } from '@/lib/utils'

/** Phase 6 — class-only video generation layer. */
export function CinematicVideoLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ImmersiveFilmEnvironment className={cn('live-video-depth', className)}>
      {children}
    </ImmersiveFilmEnvironment>
  )
}

export function CinematicVideoEngine({ children, className }: { children: ReactNode; className?: string }) {
  return <CinematicVideoLayer className={className}>{children}</CinematicVideoLayer>
}

/** Phase 6.5 — class-only audio layer. */
export function CinematicAudioLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ImmersiveAudioEnvironment className={cn('live-audio-depth', className)}>
      {children}
    </ImmersiveAudioEnvironment>
  )
}

export function CinematicAudioEngine({ children, className }: { children: ReactNode; className?: string }) {
  return <CinematicAudioLayer className={className}>{children}</CinematicAudioLayer>
}

/** Phase 7 — class-only film experience layer. */
export function CinematicFilmExperienceLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ImmersiveFilmExperienceEnvironment className={cn('live-film-experience-depth', className)}>
      {children}
    </ImmersiveFilmExperienceEnvironment>
  )
}

/** Phase 8 — class-only distribution layer. */
export function CinematicDistributionLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <CinematicDistributionFrame className={cn('live-distribution-depth', className)}>
      {children}
    </CinematicDistributionFrame>
  )
}

/** Phase 9 — class-only ecosystem layer. */
export function LiveStorytellingEcosystemLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <LiveStorytellingEcosystemFrame className={cn('live-ecosystem-depth', className)}>
      {children}
    </LiveStorytellingEcosystemFrame>
  )
}

/** Phase 10 — final operating layer. */
export function FinalCinematicOperatingLayer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <FinalCinematicOperatingFrame className={cn('live-final-os-depth', className)}>
      {children}
    </FinalCinematicOperatingFrame>
  )
}

export function FinalCinematicOperatingEngine({ children, className }: { children: ReactNode; className?: string }) {
  return <FinalCinematicOperatingLayer className={className}>{children}</FinalCinematicOperatingLayer>
}
