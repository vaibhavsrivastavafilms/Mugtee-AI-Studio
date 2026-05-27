'use client'

import { cn } from '@/lib/utils'

export function CinematicWorkflowAtmosphere({ className }: { className?: string }) {
  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 cinematic-master-atmosphere directing-atmosphere-layer',
          className
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 emotional-directing-depth opacity-80',
          className
        )}
        aria-hidden
      />
    </>
  )
}
