'use client'

import type { ReactNode } from 'react'
import { CinematicLegacyEngine } from '@/components/cinematic/legacy-archive/cinematic-legacy-engine'
import { cn } from '@/lib/utils'

/**
 * Phase 3.5 — composes inside AuthorshipPresenceEnhancement around storyboard content.
 */
export function LegacyArchivePresenceEnhancement({
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
    <CinematicLegacyEngine
      sceneIndex={sceneIndex}
      totalScenes={totalScenes}
      style={style}
      niche={niche}
      className={cn(className)}
    >
      {children}
    </CinematicLegacyEngine>
  )
}
