'use client'

import { cn } from '@/lib/utils'

export function ImmersiveWorkspaceAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 directing-atmosphere-layer immersive-environment-fade',
        className
      )}
      aria-hidden
    />
  )
}
