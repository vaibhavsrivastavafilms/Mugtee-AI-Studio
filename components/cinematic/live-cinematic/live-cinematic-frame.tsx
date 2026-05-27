'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ImmersiveMotionEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-motion-layer immersive-motion-focus', className)}>{children}</div>
}

export function ImmersiveFilmEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-video-layer immersive-film-focus', className)}>{children}</div>
}

export function ImmersiveAudioEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-audio-layer immersive-sound-focus', className)}>{children}</div>
}

export function ImmersiveFilmExperienceEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-film-experience-layer', className)}>{children}</div>
}

export function CinematicDistributionFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-distribution-layer', className)}>{children}</div>
}

export function LiveStorytellingEcosystemFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-ecosystem-layer', className)}>{children}</div>
}

export function FinalCinematicOperatingFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('live-final-os-layer', className)}>{children}</div>
}
