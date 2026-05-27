'use client'

import { cn } from '@/lib/utils'

export function WorkflowEnergyPulse({
  active = true,
  className,
}: {
  active?: boolean
  className?: string
}) {
  if (!active) return null

  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50 momentum-energy-pulse',
        className
      )}
      aria-hidden
    />
  )
}
