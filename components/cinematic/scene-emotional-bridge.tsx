'use client'

import { useMemo } from 'react'
import { getSceneEmotionalBridge } from '@/lib/creator/pacing-intelligence'
import { cn } from '@/lib/utils'

export function SceneEmotionalBridge({
  sceneIndex,
  totalScenes,
  style,
  niche,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getSceneEmotionalBridge(sceneIndex, totalScenes, style, niche),
    [sceneIndex, totalScenes, style, niche]
  )

  if (!line) return null

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/45 px-4 sm:px-5 intelligent-guidance-opacity',
        className
      )}
      aria-hidden
    >
      {line}
    </p>
  )
}
