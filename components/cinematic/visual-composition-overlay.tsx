'use client'

import { cn } from '@/lib/utils'

export function VisualCompositionOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-black/40 to-transparent cinematic-environment-focus',
        className
      )}
      aria-hidden
    />
  )
}
