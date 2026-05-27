'use client'

import { useMemo } from 'react'
import { getSequenceEnvironmentLine } from '@/lib/creator/master-cinematic-copy'
import { DirectingPresencePulse } from '@/components/cinematic/directing-presence-pulse'
import { cn } from '@/lib/utils'

export function EmotionalSequenceReader({
  stage = 'preview',
  seed = 0,
  className,
}: {
  stage?: string
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
        'inline-flex items-center justify-center gap-1.5 w-full text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/45 emotional-sequence-opacity',
        className
      )}
      role="status"
    >
      <DirectingPresencePulse />
      {line}
    </p>
  )
}
