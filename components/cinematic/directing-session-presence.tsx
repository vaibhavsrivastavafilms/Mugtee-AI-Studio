'use client'

import { useMemo } from 'react'
import { getEnvironmentReturnLine } from '@/lib/creator/operating-presence-copy'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function DirectingSessionPresence({
  status,
  seed = 0,
  className,
}: {
  status: CinematicProjectStatus | string
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getEnvironmentReturnLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/60 immersive-environment-fade',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
