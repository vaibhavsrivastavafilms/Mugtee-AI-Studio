'use client'

import { useMemo } from 'react'
import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { CinematicIdentityBadge } from '@/components/cinematic/cinematic-identity-badge'
import { cn } from '@/lib/utils'

export function CreatorStylePresence({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-5 sm:mb-6',
        className
      )}
      role="group"
      aria-label="Creator style presence"
    >
      <CinematicIdentityBadge label={identity.label} />
      <span className="text-[9px] tracking-[0.2em] uppercase text-white/30 hidden sm:inline">
        {identity.pacing}
      </span>
    </div>
  )
}
