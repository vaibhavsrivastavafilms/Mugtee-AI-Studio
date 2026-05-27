'use client'

import { cn } from '@/lib/utils'

export function FlowStateOverlay({ className }: { className?: string }) {
  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-6 sm:w-12 bg-gradient-to-r from-black/45 to-transparent',
          className
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-12 bg-gradient-to-l from-black/45 to-transparent',
          className
        )}
        aria-hidden
      />
    </>
  )
}
