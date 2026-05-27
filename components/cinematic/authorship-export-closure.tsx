'use client'

import { useMemo } from 'react'
import {
  getExportAuthorshipLegacyLine,
} from '@/lib/creator/legacy-archive-copy'
import { getExportAuthorshipImmersionLine } from '@/lib/creator/authorship-immersion-copy'
import { getExportViewingTertiaryLine } from '@/lib/creator/cinematic-delivery-copy'
import { cn } from '@/lib/utils'

export function AuthorshipExportClosure({
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
  const authorshipLine = useMemo(
    () => getExportAuthorshipImmersionLine(style, niche, seed),
    [style, niche, seed]
  )
  const legacyLine = useMemo(
    () => getExportAuthorshipLegacyLine(style, niche, seed + 1),
    [style, niche, seed]
  )

  const viewingLine = useMemo(
    () => getExportViewingTertiaryLine(style, niche, seed + 2),
    [style, niche, seed]
  )

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/26 authorship-immersion-depth hidden lg:block">
        {authorshipLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/34 cinematic-legacy-depth hidden xl:block">
        {legacyLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/22 viewing-atmosphere-opacity hidden xl:block">
        {viewingLine}
      </p>
    </div>
  )
}
