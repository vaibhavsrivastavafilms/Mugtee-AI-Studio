'use client'

import { cn } from '@/lib/utils'

export function EmotionalFrameBreathing({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 emotional-storyboard-breathing',
        className
      )}
      aria-hidden
    />
  )
}

export function CinematicVisualPulse({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-1 h-1 rounded-full bg-[#D4AF37]/35 cinematic-composition-opacity shrink-0',
        className
      )}
      aria-hidden
    />
  )
}

export function StoryboardPresenceFade({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('storyboard-presence-fade calm-opacity-transition', className)}>
      {children}
    </div>
  )
}

export function CinematicCompositionOpacity({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('cinematic-composition-opacity cinematic-composition-weight', className)}>
      {children}
    </div>
  )
}
