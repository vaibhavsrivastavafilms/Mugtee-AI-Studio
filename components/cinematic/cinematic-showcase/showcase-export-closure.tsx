'use client'

import { useMemo } from 'react'
import {
  getExportShowcasePrimaryLine,
  getExportShowcaseSecondaryLine,
  getExportShowcaseTertiaryLine,
} from '@/lib/creator/cinematic-showcase-copy'
import { getExportStoryExperienceLine } from '@/lib/creator/cinematic-story-evolution-copy'
import { cn } from '@/lib/utils'

export function CinematicShowcaseExportClosure({
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
  const primaryLine = useMemo(
    () => getExportShowcasePrimaryLine(style, niche, seed),
    [style, niche, seed]
  )
  const secondaryLine = useMemo(
    () => getExportShowcaseSecondaryLine(style, niche, seed + 1),
    [style, niche, seed]
  )
  const tertiaryLine = useMemo(
    () => getExportShowcaseTertiaryLine(style, niche, seed + 2),
    [style, niche, seed]
  )
  const storyExperienceLine = useMemo(
    () => getExportStoryExperienceLine(style, niche, seed + 3),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/38 cinematic-showcase-depth hidden xl:block">
        {primaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/22 emotional-presentation-glow hidden xl:block">
        {secondaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/20 presentation-atmosphere-opacity hidden xl:block">
        {tertiaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/32 story-experience-depth hidden 2xl:block">
        {storyExperienceLine}
      </p>
    </div>
  )
}
