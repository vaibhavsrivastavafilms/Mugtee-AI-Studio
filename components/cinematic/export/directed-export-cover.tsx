'use client'

import { useMemo } from 'react'
import { getExportClosureLine } from '@/lib/creator/flow-state-copy'
import { getExportPacingReassurance } from '@/lib/creator/pacing-intelligence'
import { getExportContinuityLine } from '@/lib/creator/workflow-presence-copy'
import { getExportLegacyLine } from '@/lib/creator/operating-presence-copy'
import {
  getExportIdentityLine,
  resolveCreatorIdentity,
} from '@/lib/creator/creator-identity'
import { CinematicIdentityBadge } from '@/components/cinematic/cinematic-identity-badge'
import { cn } from '@/lib/utils'

export function DirectedExportCover({
  title,
  hook,
  duration,
  style,
  niche,
  className,
}: {
  title: string
  hook?: string
  duration: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const continuityLine = useMemo(
    () => getExportContinuityLine((title.length + duration) % 3),
    [title, duration]
  )
  const identityLine = useMemo(
    () => getExportIdentityLine(style, niche, title.length % 3),
    [style, niche, title]
  )
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )
  const pacingReassurance = useMemo(
    () => getExportPacingReassurance(style, niche, title.length % 2),
    [style, niche, title]
  )
  const closureLine = useMemo(
    () => getExportClosureLine((title.length + duration) % 3),
    [title, duration]
  )
  const legacyLine = useMemo(
    () => getExportLegacyLine(style, niche, (title.length + duration) % 3),
    [style, niche, title, duration]
  )

  return (
    <header className={cn('px-5 py-4 border-b border-white/[0.06] cinematic-identity-glow', className)}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85">
          Directed Export · Cinematic Sequence
        </p>
        <CinematicIdentityBadge label={identity.label} />
      </div>
      <h2 className="font-display text-lg sm:text-xl text-[#F4E7C1] italic mt-1 leading-snug truncate">
        {title || 'Untitled project'}
      </h2>
      <div className="mt-3 h-px cinematic-soft-divider opacity-70" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/35">
          {identityLine}
        </p>
        <span className="text-[10px] tracking-wider uppercase text-white/40 shrink-0">
          9:16 · {duration}s
        </span>
      </div>
      <p className="mt-2 text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/45 cinematic-flow-opacity">
        {pacingReassurance}
      </p>
      <p className="mt-2 text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/50 production-continuity-breathing">
        {legacyLine}
      </p>
      <p className="mt-1 text-[8px] tracking-[0.18em] uppercase text-white/32 emotional-rhythm-breathing">
        {closureLine}
      </p>
      <p className="mt-1 text-[8px] tracking-[0.18em] uppercase text-white/24">
        {continuityLine}
      </p>
      {hook?.trim() ? (
        <p className="mt-3 text-xs text-white/45 italic line-clamp-2 leading-relaxed">
          Hook aligned · {hook}
        </p>
      ) : null}
    </header>
  )
}
