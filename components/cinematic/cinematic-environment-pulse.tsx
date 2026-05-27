'use client'

import { cn } from '@/lib/utils'

export function CinematicEnvironmentPulse({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-1 h-1 rounded-full bg-[#D4AF37]/35 production-continuity-breathing shrink-0',
        className
      )}
      aria-hidden
    />
  )
}
