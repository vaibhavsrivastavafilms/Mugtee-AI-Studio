'use client'

import { useMemo } from 'react'
import { getSequenceEnvironmentLine } from '@/lib/creator/master-cinematic-copy'
import { cn } from '@/lib/utils'

export function EmotionalDirectingPresence({
  stage,
  seed = 0,
  className,
}: {
  stage: string
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getSequenceEnvironmentLine(stage, seed),
    [stage, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 text-center emotional-sequence-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
