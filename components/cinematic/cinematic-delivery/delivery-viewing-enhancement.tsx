'use client'

import type { ReactNode } from 'react'
import { CinematicViewingEngine } from '@/components/cinematic/cinematic-delivery/cinematic-viewing-engine'
import { cn } from '@/lib/utils'

/** Phase 4 + 4.1 — composes inside legacy layer around storyboard content. */
export function CinematicDeliveryViewingEnhancement({
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
    <CinematicViewingEngine
      sceneIndex={sceneIndex}
      totalScenes={totalScenes}
      style={style}
      niche={niche}
      className={className}
    >
      {children}
    </CinematicViewingEngine>
  )
}
