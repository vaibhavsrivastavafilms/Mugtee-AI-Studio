'use client'

import { cn } from '@/lib/utils'

export function CreativeFocusLayer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 directing-focus-glow opacity-40',
        className
      )}
      aria-hidden
    />
  )
}
