'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Class-only preservation — pointer-events-none inset glow via CSS, no overlay stack. */
export function EmotionalPreservationOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('relative cinematic-preservation-layer', className)}
      aria-hidden
    >
      {children}
    </div>
  )
}
