'use client'

import { useMemo } from 'react'
import { getExportAuthorshipImmersionLine } from '@/lib/creator/authorship-immersion-copy'
import { cn } from '@/lib/utils'

export function AuthorshipImmersionExportClosure({
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
    () => getExportAuthorshipImmersionLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/34 authorship-immersion-depth',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
