'use client'

import { useMemo } from 'react'
import { getPreviousSceneEcho } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function PreviousSceneEcho({
  sceneIndex,
  style,
  niche,
  className,
}: {
  sceneIndex: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const echo = useMemo(
    () => getPreviousSceneEcho(sceneIndex, style, niche),
    [sceneIndex, style, niche]
  )

  if (!echo) return null

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.22em] uppercase text-white/28 px-4 sm:px-5 pt-2 continuity-breathing-opacity',
        className
      )}
      aria-hidden
    >
      {echo}
    </p>
  )
}
