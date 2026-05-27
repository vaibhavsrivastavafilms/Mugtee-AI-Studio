'use client'

import { useMemo } from 'react'
import { getEmotionalSequenceFlow } from '@/lib/creator/operating-presence-copy'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function EmotionalSequenceFlow({
  stage,
  seed = 0,
  className,
}: {
  stage: CinematicProjectStatus | string
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEmotionalSequenceFlow(stage, seed),
    [stage, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/45 calm-opacity-transition',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
