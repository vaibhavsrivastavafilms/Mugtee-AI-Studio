'use client'

import { useMemo } from 'react'
import { getToneMemoryLine } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function CreatorToneMemory({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getToneMemoryLine(style, niche),
    [style, niche]
  )

  return (
    <p
      className={cn(
        'text-center text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/50 creator-memory-highlight py-1.5 px-3 rounded-lg continuity-breathing-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
