'use client'

import { useMemo } from 'react'
import { getExportVisualClosureLine } from '@/lib/creator/visual-production-copy'
import { CinematicVisualPulse } from '@/components/cinematic/cinematic-visual-pulse'
import { cn } from '@/lib/utils'

export function VisualExportClosure({
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
    () => getExportVisualClosureLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center justify-center gap-1.5 text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/55 emotional-storyboard-breathing',
        className
      )}
      role="status"
    >
      <CinematicVisualPulse />
      {line}
    </p>
  )
}
