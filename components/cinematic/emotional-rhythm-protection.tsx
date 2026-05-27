'use client'

import { useMemo } from 'react'
import { getEmotionalRhythmProtection } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function EmotionalRhythmProtection({
  visible = true,
  seed = 0,
  className,
}: {
  visible?: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getEmotionalRhythmProtection(seed), [seed])

  if (!visible) return null

  return (
    <p
      className={cn(
        'text-center text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/42 emotional-rhythm-breathing',
        className
      )}
      aria-hidden
    >
      {line}
    </p>
  )
}
