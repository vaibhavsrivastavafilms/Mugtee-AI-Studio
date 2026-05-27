'use client'

import { useMemo } from 'react'
import {
  getExportLegacyArchiveLine,
  getExportLegacyArchiveSecondaryLine,
} from '@/lib/creator/legacy-archive-copy'
import { getExportViewingSecondaryLine } from '@/lib/creator/cinematic-delivery-copy'
import { getExportShowcaseSecondaryLine } from '@/lib/creator/cinematic-showcase-copy'
import { cn } from '@/lib/utils'

export function LegacyArchiveExportClosure({
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
    () => getExportLegacyArchiveLine(style, niche, seed),
    [style, niche, seed]
  )
  const secondaryLine = useMemo(
    () => getExportLegacyArchiveSecondaryLine(style, niche, seed + 1),
    [style, niche, seed]
  )

  const viewingLine = useMemo(
    () => getExportViewingSecondaryLine(style, niche, seed + 2),
    [style, niche, seed]
  )
  const showcaseLine = useMemo(
    () => getExportShowcaseSecondaryLine(style, niche, seed + 3),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/24 legacy-archive-depth">
        {primaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/30 emotional-preservation-glow hidden xl:block">
        {secondaryLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/20 cinematic-viewing-depth hidden xl:block">
        {viewingLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/18 emotional-presentation-glow hidden 2xl:block">
        {showcaseLine}
      </p>
    </div>
  )
}
