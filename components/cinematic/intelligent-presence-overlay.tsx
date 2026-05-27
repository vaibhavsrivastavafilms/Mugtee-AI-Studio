'use client'

import { cn } from '@/lib/utils'

export function IntelligentPresenceOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 visual-atmosphere-layer opacity-30 intelligent-guidance-opacity',
        className
      )}
      aria-hidden
    />
  )
}
