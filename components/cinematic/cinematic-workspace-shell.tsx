'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AtmosphericGradientLayer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 atmospheric-depth-layer opacity-80',
        className
      )}
      aria-hidden
    />
  )
}

export function VisualFocusVignette({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 cinematic-vignette-soft opacity-60',
        className
      )}
      aria-hidden
    />
  )
}

export function ImmersiveDepthOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(0,0,0,0.55),transparent_55%)]',
        className
      )}
      aria-hidden
    />
  )
}

export function CinematicWorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AtmosphericGradientLayer />
      <VisualFocusVignette />
      <ImmersiveDepthOverlay />
      <div className="relative z-[1] immersive-workspace-fade">{children}</div>
    </div>
  )
}
