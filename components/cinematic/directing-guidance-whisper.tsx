'use client'

import { useMemo } from 'react'
import {
  getDirectingWhisper,
  type GuidanceContext,
} from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function DirectingGuidanceWhisper({
  context,
  style,
  niche,
  seed = 0,
  className,
}: {
  context: GuidanceContext
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const whisper = useMemo(
    () => getDirectingWhisper(context, style, niche, seed),
    [context, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[9px] tracking-[0.2em] uppercase text-white/32 text-center intelligent-guidance-opacity',
        className
      )}
      role="status"
    >
      {whisper}
    </p>
  )
}
