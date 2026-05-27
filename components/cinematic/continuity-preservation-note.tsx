'use client'

import { useMemo } from 'react'
import { getContinuityPreservationNote } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function ContinuityPreservationNote({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const note = useMemo(() => getContinuityPreservationNote(seed), [seed])

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.18em] uppercase text-white/30 text-center',
        className
      )}
      role="status"
    >
      {note}
    </p>
  )
}
