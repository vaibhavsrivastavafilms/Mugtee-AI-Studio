'use client'

import type { ReactNode } from 'react'
import { CinematicViewingFrame } from '@/components/cinematic/cinematic-delivery/viewing-frame'
import { CinematicViewingBreathing } from '@/components/cinematic/cinematic-delivery/viewing-micro-motion'
import { CinematicShowcaseSharingEnhancement } from '@/components/cinematic/cinematic-showcase/showcase-sharing-enhancement'
import {
  EmotionalPlaybackPresence,
  ViewingAnchorPresence,
  CinematicViewingEnvironment,
  CinematicShowcasePresence,
  EmotionalViewingAtmosphere,
  CinematicPlaybackFlow,
  EmotionalViewingRhythm,
  CinematicViewingMemory,
  EmotionalPlaybackFocus,
  CinematicSequenceView,
} from '@/components/cinematic/cinematic-delivery/delivery-presence-components'
import { cn } from '@/lib/utils'

/**
 * Phase 4 viewing engine — presentation atmosphere on storyboard body.
 * One mobile line; restrained desktop presence; no player chrome.
 */
export function CinematicViewingEngine({
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
  const seed = sceneIndex % 3

  return (
    <div className={cn('relative cinematic-viewing-depth cinematic-showcase-layer', className)}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-0.5 border-b border-white/[0.012]"
        role="status"
        aria-label="Cinematic viewing presence"
      >
        <EmotionalPlaybackPresence style={style} niche={niche} seed={seed} />
        <ViewingAnchorPresence
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
        />
        <CinematicViewingEnvironment style={style} niche={niche} seed={seed} />
        <CinematicShowcasePresence style={style} niche={niche} seed={seed} />
        <EmotionalViewingAtmosphere style={style} niche={niche} seed={seed} />
      </div>

      <CinematicViewingFrame>
        <CinematicViewingBreathing>
          <CinematicShowcaseSharingEnhancement
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            style={style}
            niche={niche}
          >
            {children}
          </CinematicShowcaseSharingEnhancement>
        </CinematicViewingBreathing>
      </CinematicViewingFrame>

      <div
        className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-0.5 border-t border-white/[0.012]"
        role="status"
      >
        <CinematicPlaybackFlow
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <EmotionalViewingRhythm style={style} niche={niche} seed={seed} />
        <EmotionalPlaybackFocus sceneIndex={sceneIndex} seed={seed} />
        <CinematicSequenceView
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <CinematicViewingMemory style={style} niche={niche} seed={seed} className="sm:ml-auto" />
      </div>
    </div>
  )
}

/** Wraps immersive story content for compile/preview viewing contexts. */
export function ImmersiveStoryViewer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-viewing-focus visual-showcase-depth', className)}>
      <CinematicViewingBreathing>{children}</CinematicViewingBreathing>
    </div>
  )
}
