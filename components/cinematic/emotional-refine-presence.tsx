'use client'

import { useMemo } from 'react'
import { getEmotionalRefinePresence } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function EmotionalRefinePresence({
  visible,
  seed = 0,
  className,
}: {
  visible?: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getEmotionalRefinePresence(seed), [seed])

  if (visible === false) return null

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/48 text-center intelligent-guidance-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
