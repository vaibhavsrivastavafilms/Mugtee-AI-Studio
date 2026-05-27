'use client'

import { useMemo } from 'react'
import { getExportClosureLine } from '@/lib/creator/master-cinematic-copy'
import { getExportLegacyLine } from '@/lib/creator/operating-presence-copy'
import { getExportVisualClosureLine } from '@/lib/creator/visual-production-copy'
import { getExportStoryWorldLine } from '@/lib/creator/story-world-copy'
import { DirectingPresencePulse } from '@/components/cinematic/directing-presence-pulse'
import { cn } from '@/lib/utils'

export function DirectedLegacyPresence({
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
  const closureLine = useMemo(
    () => getExportClosureLine(style, niche, seed),
    [style, niche, seed]
  )
  const legacyLine = useMemo(
    () => getExportLegacyLine(style, niche, seed + 1),
    [style, niche, seed]
  )

  const visualLine = useMemo(
    () => getExportVisualClosureLine(style, niche, seed + 2),
    [style, niche, seed]
  )

  const worldLine = useMemo(
    () => getExportStoryWorldLine(style, niche, seed + 3),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1.5', className)} role="status">
      <p className="inline-flex items-center justify-center gap-1.5 text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/60 cinematic-world-breathing">
        <DirectingPresencePulse />
        {closureLine}
      </p>
      <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/45 emotional-storyboard-breathing">
        {visualLine}
      </p>
      <p className="text-[8px] tracking-[0.18em] uppercase text-white/28 visual-world-opacity">
        {worldLine}
      </p>
      <p className="text-[8px] tracking-[0.18em] uppercase text-white/32 emotional-sequence-opacity">
        {legacyLine}
      </p>
    </div>
  )
}
