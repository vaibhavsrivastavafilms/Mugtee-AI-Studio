'use client'

import { useMemo } from 'react'
import {
  getExportStoryExperienceLine,
  getExportStoryExperienceSecondaryLine,
  getExportContinuityLine,
  getExportIdentityLine,
  getExportUniverseLine,
  getExportOperatingLine,
} from '@/lib/creator/cinematic-story-evolution-copy'
import { cn } from '@/lib/utils'

export function StoryExperienceExportClosure({
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
  const primary = useMemo(() => getExportStoryExperienceLine(style, niche, seed), [style, niche, seed])
  const secondary = useMemo(() => getExportStoryExperienceSecondaryLine(seed + 1), [seed])

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/36 story-experience-depth hidden 2xl:block">
        {primary}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/20 story-experience-glow hidden 2xl:block">
        {secondary}
      </p>
    </div>
  )
}

/** Extends viewing + showcase export with evolution continuity lines. */
export function ViewingExportClosure({
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
  const continuity = useMemo(() => getExportContinuityLine(style, niche, seed), [style, niche, seed])
  const identity = useMemo(() => getExportIdentityLine(style, niche, seed + 1), [style, niche, seed])
  const universe = useMemo(() => getExportUniverseLine(style, niche, seed + 2), [style, niche, seed])
  const operating = useMemo(() => getExportOperatingLine(style, niche, seed + 3), [style, niche, seed])

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/18 narrative-continuity-depth hidden 2xl:block">
        {continuity}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/16 storytelling-identity-depth hidden 2xl:block">
        {identity}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/28 cinematic-universe-layer hidden 2xl:block">
        {universe}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/14 story-operating-layer hidden 2xl:block">
        {operating}
      </p>
    </div>
  )
}
