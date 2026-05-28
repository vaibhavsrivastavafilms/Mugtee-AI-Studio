'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicExportFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'cinematic-export-frame relative w-full max-w-[240px] sm:max-w-[280px] aspect-[9/16] rounded-[24px] sm:rounded-[28px] overflow-hidden storyboard-edge-fade immersive-session-fade cinematic-visual-depth production-frame-focus',
        'border border-[#D4AF37]/20 storyboard-focus-halo emotional-focus-ring cinematic-identity-glow directing-focus-glow calm-opacity-transition',
        className
      )}
    >
      {children}
    </div>
  )
}
