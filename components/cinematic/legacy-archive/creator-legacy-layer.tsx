'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Applies preservation depth class only — no stacked overlays. */
export function CreatorLegacyLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative cinematic-legacy-depth legacy-archive-depth', className)}>
      {children}
    </div>
  )
}
