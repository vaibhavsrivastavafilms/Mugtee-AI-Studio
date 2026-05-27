'use client'

import { useMemo } from 'react'
import { getCompletionAchievementLine } from '@/lib/creator/workflow-presence-copy'
import { cn } from '@/lib/utils'

export function CreatorAchievementLine({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getCompletionAchievementLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[10px] tracking-[0.24em] uppercase text-[#C8A24E]/70 mb-3',
        className
      )}
    >
      {line}
    </p>
  )
}
