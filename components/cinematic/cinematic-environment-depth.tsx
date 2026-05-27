'use client'

import { cn } from '@/lib/utils'

export function CinematicEnvironmentDepth({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 cinematic-operating-depth opacity-90',
        className
      )}
      aria-hidden
    />
  )
}
