'use client'

import { useMemo } from 'react'
import { getSelectiveRefineGuidance } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function SelectiveRefineGuidance({
  visible,
  seed = 0,
  className,
}: {
  visible?: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getSelectiveRefineGuidance(seed), [seed])

  if (visible === false) return null

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.16em] uppercase text-white/28 text-right hidden sm:block',
        className
      )}
      aria-hidden
    >
      {line}
    </p>
  )
}
