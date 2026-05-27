'use client'

import { useMemo } from 'react'
import { getExportStoryWorldLine } from '@/lib/creator/story-world-copy'
import { EmotionalAtmospherePulse } from '@/components/cinematic/story-world/micro-motion'
import { cn } from '@/lib/utils'

export function StoryWorldExportClosure({
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
    () => getExportStoryWorldLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center justify-center gap-1.5 text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/50 visual-story-breathing',
        className
      )}
      role="status"
    >
      <EmotionalAtmospherePulse />
      {line}
    </p>
  )
}
