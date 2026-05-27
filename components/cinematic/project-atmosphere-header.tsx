'use client'

import { useMemo } from 'react'
import {
  getProjectAtmosphereSubtitle,
  getProjectWorldHeadline,
} from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function ProjectAtmosphereHeader({
  title,
  style,
  niche,
  className,
}: {
  title?: string | null
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const headline = useMemo(
    () => getProjectWorldHeadline(title, style, niche),
    [title, style, niche]
  )
  const subtitle = useMemo(
    () => getProjectAtmosphereSubtitle(style, niche),
    [style, niche]
  )

  return (
    <header className={cn('text-center mb-3 sm:mb-4 px-2', className)}>
      <p className="text-[8px] sm:text-[9px] tracking-[0.28em] uppercase text-[#C8A24E]/65 mb-1 cinematic-world-opacity">
        Active production world
      </p>
      <h2 className="font-display text-lg sm:text-xl text-[#F4E7C1]/90 italic leading-snug truncate max-w-md mx-auto">
        {headline}
      </h2>
      <p className="mt-1 text-[8px] tracking-[0.18em] uppercase text-white/30">
        {subtitle}
      </p>
    </header>
  )
}
