'use client'

import type { ReactNode } from 'react'
import { CinematicShowcaseEngine } from '@/components/cinematic/cinematic-showcase/cinematic-showcase-engine'

/** Phase 4.1 — composes inside viewing layer around storyboard content. */
export function CinematicShowcaseSharingEnhancement({
  sceneIndex,
  totalScenes,
  style,
  niche,
  children,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <CinematicShowcaseEngine
      sceneIndex={sceneIndex}
      totalScenes={totalScenes}
      style={style}
      niche={niche}
      className={className}
    >
      {children}
    </CinematicShowcaseEngine>
  )
}
