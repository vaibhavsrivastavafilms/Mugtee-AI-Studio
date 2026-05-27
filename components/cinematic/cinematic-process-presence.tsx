'use client'

import { useMemo } from 'react'
import { getCinematicProcessPresence } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function CinematicProcessPresence({
  stage,
  seed = 0,
  className,
}: {
  stage: string
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getCinematicProcessPresence(stage, seed),
    [stage, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 text-center',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
