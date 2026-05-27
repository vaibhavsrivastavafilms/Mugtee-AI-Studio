'use client'

import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { DirectedProjectLabel } from '@/components/cinematic/directed-project-label'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export function CinematicProjectCover({
  title,
  prompt,
  style,
  niche,
  statusLabel,
  className,
}: {
  title: string
  prompt?: string
  style?: string | null
  niche?: string | null
  statusLabel?: string
  className?: string
}) {
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )

  return (
    <section
      className={cn(
        'relative rounded-[28px] border border-[#D4AF37]/18 overflow-hidden cinematic-identity-glow cinematic-vignette-soft',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08]/45 via-black/30 to-black/50 pointer-events-none" />
      <div className="relative p-5 sm:p-6">
        <DirectedProjectLabel label={identity.label} status={statusLabel} />
        <h3 className="font-display text-xl sm:text-2xl text-[#F4E7C1] italic leading-snug mt-3 truncate">
          {title || 'Untitled production'}
        </h3>
        {prompt ? (
          <p className="mt-2 text-sm text-white/45 line-clamp-2 leading-relaxed">{prompt}</p>
        ) : null}
        <p className="mt-4 text-[9px] tracking-[0.2em] uppercase text-white/30 border-t border-white/[0.05] pt-3">
          {identity.pacing} · directed sequence
        </p>
      </div>
    </section>
  )
}
