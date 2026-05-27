'use client'

import { useMemo } from 'react'
import { getExportEmotionalSequenceLine } from '@/lib/creator/emotional-sequence-copy'
import { cn } from '@/lib/utils'

export function EmotionalSequenceExportClosure({
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
    () => getExportEmotionalSequenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/32 emotional-sequence-depth',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
