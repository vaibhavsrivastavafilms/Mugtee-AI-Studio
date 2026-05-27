'use client'

import { cn } from '@/lib/utils'

export function CinematicWorldBreathing({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 visual-story-breathing opacity-40',
        className
      )}
      aria-hidden
    />
  )
}

export function EmotionalAtmospherePulse({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-1 h-1 rounded-full bg-[#D4AF37]/30 cinematic-environment-opacity shrink-0',
        className
      )}
      aria-hidden
    />
  )
}

export function VisualWorldPresenceFade({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('visual-world-presence-fade calm-opacity-transition', className)}>
      {children}
    </div>
  )
}

export function CinematicEnvironmentOpacity({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('cinematic-environment-opacity', className)}>{children}</div>
  )
}
