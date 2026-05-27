'use client'

import { useMemo } from 'react'
import { getAtmosphereMemoryLine } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

export function CreatorEnvironmentMemory({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getAtmosphereMemoryLine(style, niche),
    [style, niche]
  )

  return (
    <p
      className={cn(
        'text-[8px] sm:text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/45 text-center calm-opacity-transition',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
