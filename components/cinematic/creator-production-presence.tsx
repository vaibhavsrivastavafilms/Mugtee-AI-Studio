'use client'

import { useMemo } from 'react'
import { getProductionPresenceLine } from '@/lib/creator/operating-presence-copy'
import { CinematicEnvironmentPulse } from '@/components/cinematic/cinematic-environment-pulse'
import { cn } from '@/lib/utils'

export function CreatorProductionPresence({
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
    () => getProductionPresenceLine(seed + (style?.length ?? 0)),
    [seed, style]
  )

  return (
    <div
      className={cn(
        'hidden sm:flex items-center justify-center gap-2 mb-4 sm:mb-5 cinematic-world-opacity',
        className
      )}
      role="status"
    >
      <CinematicEnvironmentPulse />
      <p className="text-[9px] tracking-[0.24em] uppercase text-[#C8A24E]/55">
        {line}
      </p>
    </div>
  )
}
