'use client'

import type { ReactNode } from 'react'
import { CinematicShowcaseFrame } from '@/components/cinematic/cinematic-showcase/showcase-frame'
import { CinematicShowcaseBreathing } from '@/components/cinematic/cinematic-showcase/showcase-micro-motion'
import { CinematicStoryEvolutionStack } from '@/components/cinematic/story-evolution/story-evolution-stack'
import {
  EmotionalSharingPresence,
  SharingAnchorPresence,
  CinematicPresentationEnvironment,
  CinematicHandoffPresence,
  EmotionalViewerTransition,
  CinematicShowcaseFlow,
  CinematicShowcaseRhythm,
  EmotionalPresentationFocus,
  CinematicShowcaseMemory,
  CinematicAtmosphereContinuity,
} from '@/components/cinematic/cinematic-showcase/showcase-presence-components'
import { cn } from '@/lib/utils'

/**
 * Phase 4.1 showcase engine — sharing/presentation atmosphere on storyboard body.
 * One mobile line; restrained desktop presence; no social UI.
 */
export function CinematicShowcaseEngine({
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
    <div className={cn('relative cinematic-showcase-depth cinematic-sharing-layer', className)}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-0.5 border-b border-white/[0.01]"
        role="status"
        aria-label="Cinematic showcase presence"
      >
        <EmotionalSharingPresence style={style} niche={niche} seed={seed} />
        <SharingAnchorPresence
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
        />
        <CinematicPresentationEnvironment style={style} niche={niche} seed={seed} />
        <CinematicHandoffPresence style={style} niche={niche} seed={seed} />
        <EmotionalViewerTransition style={style} niche={niche} seed={seed} />
      </div>

      <CinematicShowcaseFrame>
        <CinematicShowcaseBreathing>
          <CinematicStoryEvolutionStack
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            style={style}
            niche={niche}
          >
            {children}
          </CinematicStoryEvolutionStack>
        </CinematicShowcaseBreathing>
      </CinematicShowcaseFrame>

      <div
        className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-0.5 border-t border-white/[0.01]"
        role="status"
      >
        <CinematicShowcaseFlow
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <CinematicShowcaseRhythm style={style} niche={niche} seed={seed} />
        <EmotionalPresentationFocus sceneIndex={sceneIndex} seed={seed} />
        <CinematicShowcaseMemory style={style} niche={niche} seed={seed} />
        <CinematicAtmosphereContinuity
          style={style}
          niche={niche}
          seed={seed}
          className="sm:ml-auto"
        />
      </div>
    </div>
  )
}

/** Immersive showcase wrapper for compile/preview presentation contexts. */
export function ImmersiveShowcaseLayer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative immersive-showcase-focus visual-sharing-opacity', className)}>
      <CinematicShowcaseBreathing>{children}</CinematicShowcaseBreathing>
    </div>
  )
}
