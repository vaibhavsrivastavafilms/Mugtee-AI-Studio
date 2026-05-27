'use client'

import { useMemo } from 'react'
import { getDeliveryAtmosphereLine } from '@/lib/creator/master-cinematic-copy'
import { getExportVisualClosureLine } from '@/lib/creator/visual-production-copy'
import { getExportStoryWorldLine } from '@/lib/creator/story-world-copy'
import { getExportEmotionalSequenceLine } from '@/lib/creator/emotional-sequence-copy'
import { getExportDirectorialPresenceLine } from '@/lib/creator/directorial-presence-copy'
import { getExportAuthorshipImmersionLine } from '@/lib/creator/authorship-immersion-copy'
import {
  getExportLegacyArchiveLine,
  getExportLegacyArchiveSecondaryLine,
  getExportAuthorshipLegacyLine,
} from '@/lib/creator/legacy-archive-copy'
import {
  getExportViewingPrimaryLine,
  getExportViewingSecondaryLine,
} from '@/lib/creator/cinematic-delivery-copy'
import { getExportShowcasePrimaryLine } from '@/lib/creator/cinematic-showcase-copy'
import { getExportOperatingLine } from '@/lib/creator/cinematic-story-evolution-copy'
import { getExportFinalLine } from '@/lib/creator/live-cinematic-copy'
import { cn } from '@/lib/utils'

export function CinematicDeliveryAtmosphere({
  seed = 0,
  style,
  niche,
  className,
}: {
  seed?: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(() => getDeliveryAtmosphereLine(seed), [seed])
  const visualLine = useMemo(
    () => getExportVisualClosureLine(style, niche, seed + 1),
    [style, niche, seed]
  )

  const worldLine = useMemo(
    () => getExportStoryWorldLine(style, niche, seed + 2),
    [style, niche, seed]
  )

  const sequenceLine = useMemo(
    () => getExportEmotionalSequenceLine(style, niche, seed + 3),
    [style, niche, seed]
  )

  const directorialLine = useMemo(
    () => getExportDirectorialPresenceLine(style, niche, seed + 4),
    [style, niche, seed]
  )

  const authorshipLine = useMemo(
    () => getExportAuthorshipImmersionLine(style, niche, seed + 5),
    [style, niche, seed]
  )

  const legacyArchiveLine = useMemo(
    () => getExportLegacyArchiveLine(style, niche, seed + 6),
    [style, niche, seed]
  )

  const legacySecondaryLine = useMemo(
    () => getExportLegacyArchiveSecondaryLine(style, niche, seed + 7),
    [style, niche, seed]
  )

  const authorshipLegacyLine = useMemo(
    () => getExportAuthorshipLegacyLine(style, niche, seed + 8),
    [style, niche, seed]
  )

  const viewingPrimaryLine = useMemo(
    () => getExportViewingPrimaryLine(style, niche, seed + 9),
    [style, niche, seed]
  )

  const viewingSecondaryLine = useMemo(
    () => getExportViewingSecondaryLine(style, niche, seed + 10),
    [style, niche, seed]
  )

  const showcasePrimaryLine = useMemo(
    () => getExportShowcasePrimaryLine(style, niche, seed + 11),
    [style, niche, seed]
  )

  const operatingLine = useMemo(
    () => getExportOperatingLine(style, niche, seed + 12),
    [style, niche, seed]
  )

  const finalFilmLine = useMemo(
    () => getExportFinalLine(style, niche, seed + 13),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p
        className={cn(
          'text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/75 cinematic-presence-glow'
        )}
      >
        {line}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/30 hidden sm:block visual-sequence-opacity">
        {visualLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/40 visual-story-breathing">
        {worldLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/28 emotional-sequence-depth hidden sm:block">
        {sequenceLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/36 directorial-presence-depth hidden md:block">
        {directorialLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/26 authorship-immersion-depth hidden lg:block">
        {authorshipLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/32 legacy-archive-depth hidden xl:block">
        {legacyArchiveLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/22 emotional-preservation-glow hidden xl:block">
        {legacySecondaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/30 cinematic-legacy-depth hidden xl:block">
        {authorshipLegacyLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/38 cinematic-viewing-depth hidden xl:block">
        {viewingPrimaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/22 emotional-showcase-glow hidden xl:block">
        {viewingSecondaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/36 cinematic-showcase-depth hidden 2xl:block">
        {showcasePrimaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/16 story-operating-layer hidden 2xl:block">
        {operatingLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/28 live-final-os-depth hidden 2xl:block">
        {finalFilmLine}
      </p>
    </div>
  )
}
