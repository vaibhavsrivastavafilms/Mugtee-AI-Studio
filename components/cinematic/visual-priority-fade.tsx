'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function VisualPriorityFade({
  children,
  active = true,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        active ? 'cinematic-attention-weight' : 'cinematic-attention-weight-muted',
        className
      )}
    >
      {children}
    </div>
  )
}

export function ImmersiveFocusGradient({
  active = true,
  className,
}: {
  active?: boolean
  className?: string
}) {
  if (!active) return null

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_40%,rgba(43,26,8,0.12),transparent_70%)]',
        className
      )}
      aria-hidden
    />
  )
}

export function DirectingDepthMask({
  active = true,
  className,
}: {
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-300',
        active ? 'opacity-100' : 'opacity-0',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.25)]" />
    </div>
  )
}
