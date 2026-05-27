'use client'

import { useMemo } from 'react'
import { getPacingBalanceLabel } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function PacingBalanceIndicator({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const label = useMemo(
    () => getPacingBalanceLabel(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.2em] uppercase text-white/35 text-center continuity-preservation-fade',
        className
      )}
      role="status"
    >
      {label}
    </p>
  )
}
