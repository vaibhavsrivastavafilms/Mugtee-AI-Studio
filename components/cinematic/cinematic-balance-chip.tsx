'use client'

import { useMemo } from 'react'
import { getCinematicBalanceChip } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function CinematicBalanceChip({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const label = useMemo(
    () => getCinematicBalanceChip(style, niche),
    [style, niche]
  )

  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded-full border border-white/[0.06] text-[8px] tracking-[0.18em] uppercase text-white/35',
        className
      )}
      role="status"
    >
      {label}
    </span>
  )
}
