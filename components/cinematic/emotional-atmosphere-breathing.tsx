'use client'

import { cn } from '@/lib/utils'

export function EmotionalAtmosphereBreathing({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 cinematic-world-breathing opacity-30',
        className
      )}
      aria-hidden
    />
  )
}

export function DirectingPresencePulse({ className }: { className?: string }) {
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
