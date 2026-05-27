'use client'

import { useMemo } from 'react'
import { getExportDirectorialPresenceLine } from '@/lib/creator/directorial-presence-copy'
import { cn } from '@/lib/utils'

export function DirectorialPresenceExportClosure({
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
  const line = useMemo(
    () => getExportDirectorialPresenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/36 directorial-presence-depth',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
