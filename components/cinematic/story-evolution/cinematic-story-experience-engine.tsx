'use client'

import type { ReactNode } from 'react'
import { CinematicStoryFrame } from '@/components/cinematic/story-evolution/story-evolution-frame'
import { StoryExperienceBreathing } from '@/components/cinematic/story-evolution/story-evolution-micro-motion'
import {
  StoryExperienceMobileAnchor,
  EmotionalViewingImmersion,
  CinematicEmotionalImmersion,
  EmotionalSequenceAbsorption,
  CinematicStoryRhythm,
  CinematicStoryMemory,
  CinematicNarrativeContinuity,
  EmotionalStoryThread,
  CinematicStoryEvolution,
  CinematicStorytellingIdentity,
  CinematicUniversePresence,
  CinematicOperatingPresence,
} from '@/components/cinematic/story-evolution/story-evolution-presence-components'
import { cn } from '@/lib/utils'

/** Phase 4.2 — story experience with one mobile line; desktop presence restrained. */
export function CinematicStoryExperienceEngine({
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
    <div className={cn('relative story-experience-depth story-experience-layer', className)}>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 border-b border-white/[0.008]"
        role="status"
        aria-label="Cinematic story experience"
      >
        <StoryExperienceMobileAnchor
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
          className="hidden sm:block"
        />
        <EmotionalViewingImmersion style={style} niche={niche} seed={seed} />
        <CinematicEmotionalImmersion style={style} niche={niche} seed={seed} />
        <EmotionalSequenceAbsorption seed={seed} />
      </div>

      <CinematicStoryFrame>
        <StoryExperienceBreathing>{children}</StoryExperienceBreathing>
      </CinematicStoryFrame>

      <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 border-t border-white/[0.008]" role="status">
        <CinematicStoryRhythm sceneIndex={sceneIndex} totalScenes={totalScenes} seed={seed} />
        <CinematicStoryMemory style={style} niche={niche} seed={seed} />
        <EmotionalStoryThread sceneIndex={sceneIndex} style={style} seed={seed} />
        <CinematicStoryEvolution style={style} niche={niche} seed={seed} />
        <CinematicStorytellingIdentity style={style} niche={niche} seed={seed} />
        <CinematicUniversePresence style={style} niche={niche} seed={seed} />
        <CinematicOperatingPresence style={style} niche={niche} seed={seed} />
        <CinematicNarrativeContinuity
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
      </div>
    </div>
  )
}
