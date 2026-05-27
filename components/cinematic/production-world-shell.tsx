'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ProductionWorldShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.05] bg-black/25 px-3 py-3 sm:py-4 cinematic-master-atmosphere immersive-production-fade visual-composition-weight',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl cinematic-presence-glow opacity-60"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}
