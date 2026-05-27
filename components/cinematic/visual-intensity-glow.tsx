'use client'

import { cn } from '@/lib/utils'

export function VisualIntensityGlow({
  level = 3,
  className,
}: {
  level?: number
  className?: string
}) {
  const clamped = Math.min(5, Math.max(1, level))
  const opacity = 0.03 + clamped * 0.012

  return (
    <div
      className={cn('pointer-events-none emotional-escalation-glow', className)}
      style={{
        boxShadow: `inset 0 0 48px rgba(212, 175, 55, ${opacity})`,
      }}
      aria-hidden
    />
  )
}
