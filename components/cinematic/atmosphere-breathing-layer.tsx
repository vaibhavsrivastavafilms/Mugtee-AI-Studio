'use client'

import { cn } from '@/lib/utils'

export function AtmosphereBreathingLayer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.04),transparent_55%)] atmosphere-breathing-layer',
        className
      )}
      aria-hidden
    />
  )
}
