'use client'

import { useMemo } from 'react'
import { getIdentityPresenceLine } from '@/lib/creator/master-cinematic-copy'
import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { CinematicIdentityBadge } from '@/components/cinematic/cinematic-identity-badge'
import { cn } from '@/lib/utils'

export function CinematicIdentityPresence({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(() => getIdentityPresenceLine(style, niche), [style, niche])
  const identity = useMemo(() => resolveCreatorIdentity(style, niche), [style, niche])

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2 cinematic-editorial-spacing',
        className
      )}
      role="status"
    >
      <CinematicIdentityBadge label={identity.label} />
      <p className="text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50">
        {line}
      </p>
    </div>
  )
}
