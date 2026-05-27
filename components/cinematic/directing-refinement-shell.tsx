'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DirectingRefinementShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'space-y-1.5 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2 cinematic-presence-glow immersive-production-fade',
        className
      )}
      role="status"
    >
      {children}
    </div>
  )
}
