'use client'

import { cn } from '@/lib/utils'

export function CinematicStoryworldAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 emotional-environment-depth opacity-40',
        className
      )}
      aria-hidden
    />
  )
}

export function EmotionalEnvironmentDepth({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent',
        className
      )}
      aria-hidden
    />
  )
}

export function VisualWorldOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 cinematic-environment-opacity opacity-30',
        className
      )}
      aria-hidden
    />
  )
}

export function CinematicWorldComposition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative cinematic-world-composition storyworld-composition-weight', className)}>
      <CinematicStoryworldAtmosphere />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
