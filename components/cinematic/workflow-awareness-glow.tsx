'use client'

import { cn } from '@/lib/utils'

export function WorkflowAwarenessGlow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 pacing-awareness-glow opacity-40',
        className
      )}
      aria-hidden
    />
  )
}
