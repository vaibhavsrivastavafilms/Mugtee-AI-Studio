'use client'

import { useMemo } from 'react'
import { getActiveSequenceLine } from '@/lib/creator/operating-presence-copy'
import { CinematicEnvironmentPulse } from '@/components/cinematic/cinematic-environment-pulse'
import { cn } from '@/lib/utils'

export function ActiveSequencePresence({
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
  const line = useMemo(
    () => getActiveSequenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50 production-continuity-breathing',
        className
      )}
      role="status"
    >
      <CinematicEnvironmentPulse className="scale-75" />
      {line}
    </p>
  )
}
