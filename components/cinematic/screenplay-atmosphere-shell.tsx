'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ScreenplayAtmosphereShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative screenplay-rhythm-spacing cinematic-editorial-spacing immersive-production-fade',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 directing-environment-focus rounded-[28px] opacity-50"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  )
}
