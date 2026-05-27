'use client'

import { useMemo } from 'react'
import {
  getExportViewingPrimaryLine,
  getExportViewingSecondaryLine,
  getExportViewingTertiaryLine,
} from '@/lib/creator/cinematic-delivery-copy'
import { getExportShowcasePrimaryLine } from '@/lib/creator/cinematic-showcase-copy'
import {
  getExportStoryExperienceLine,
  getExportStoryExperienceSecondaryLine,
} from '@/lib/creator/cinematic-story-evolution-copy'
import { getExportMotionLine } from '@/lib/creator/live-cinematic-copy'
import { cn } from '@/lib/utils'

export function CinematicDeliveryExportClosure({
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
    () => getExportViewingPrimaryLine(style, niche, seed),
    [style, niche, seed]
  )
  const secondaryLine = useMemo(
    () => getExportViewingSecondaryLine(style, niche, seed + 1),
    [style, niche, seed]
  )
  const tertiaryLine = useMemo(
    () => getExportViewingTertiaryLine(style, niche, seed + 2),
    [style, niche, seed]
  )
  const showcaseLine = useMemo(
    () => getExportShowcasePrimaryLine(style, niche, seed + 3),
    [style, niche, seed]
  )
  const storyExperienceLine = useMemo(
    () => getExportStoryExperienceLine(style, niche, seed + 4),
    [style, niche, seed]
  )
  const storyExperienceSecondary = useMemo(
    () => getExportStoryExperienceSecondaryLine(seed + 5),
    [seed]
  )
  const motionLine = useMemo(
    () => getExportMotionLine(style, niche, seed + 6),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/40 cinematic-viewing-depth">
        {primaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/24 emotional-showcase-glow hidden lg:block">
        {secondaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/22 viewing-atmosphere-opacity hidden xl:block">
        {tertiaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/36 cinematic-showcase-depth hidden 2xl:block">
        {showcaseLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/34 story-experience-depth hidden 2xl:block">
        {storyExperienceLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/18 story-experience-glow hidden 2xl:block">
        {storyExperienceSecondary}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/32 live-motion-depth hidden 2xl:block">
        {motionLine}
      </p>
    </div>
  )
}
