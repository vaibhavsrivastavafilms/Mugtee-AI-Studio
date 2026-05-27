'use client'

import { useMemo } from 'react'
import {
  getExportMotionLine,
  getExportVideoLine,
  getExportAudioLine,
  getExportFilmLine,
  getExportDistributionLine,
  getExportEcosystemLine,
  getExportFinalLine,
} from '@/lib/creator/live-cinematic-copy'
import { cn } from '@/lib/utils'

export function LiveMotionExportClosure({
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
  const primary = useMemo(() => getExportMotionLine(style, niche, seed), [style, niche, seed])
  const video = useMemo(() => getExportVideoLine(style, niche, seed + 1), [style, niche, seed])

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/34 live-motion-depth hidden 2xl:block">
        {primary}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/16 live-video-depth hidden 2xl:block">
        {video}
      </p>
    </div>
  )
}

export function LiveFilmExportClosure({
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
  const audio = useMemo(() => getExportAudioLine(style, niche, seed), [style, niche, seed])
  const film = useMemo(() => getExportFilmLine(style, niche, seed + 1), [style, niche, seed])
  const distribution = useMemo(() => getExportDistributionLine(style, niche, seed + 2), [style, niche, seed])
  const ecosystem = useMemo(() => getExportEcosystemLine(style, niche, seed + 3), [style, niche, seed])
  const final = useMemo(() => getExportFinalLine(style, niche, seed + 4), [style, niche, seed])

  return (
    <div className={cn('space-y-1', className)} role="status">
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/16 live-audio-depth hidden 2xl:block">
        {audio}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/14 live-film-experience-depth hidden 2xl:block">
        {film}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/14 live-distribution-depth hidden 2xl:block">
        {distribution}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/26 live-ecosystem-depth hidden 2xl:block">
        {ecosystem}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/12 live-final-os-depth hidden 2xl:block">
        {final}
      </p>
    </div>
  )
}
