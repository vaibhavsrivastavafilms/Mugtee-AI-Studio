'use client'

import type { ReactNode } from 'react'
import { CinematicStoryExperienceEngine } from '@/components/cinematic/story-evolution/cinematic-story-experience-engine'
import {
  CinematicStorytellingContinuityLayer,
  CinematicStorytellingIdentityLayer,
  CinematicStoryUniverseLayer,
  CinematicStorytellingOperatingLayer,
} from '@/components/cinematic/story-evolution/story-evolution-layers'
import { LiveCinematicStack } from '@/components/cinematic/live-cinematic/live-cinematic-stack'

/**
 * Phases 4.2 → 10 — composes inside showcase frame.
 * One mobile story-experience line; inner phases are class-only depth layers.
 */
export function CinematicStoryEvolutionStack({
  sceneIndex,
  totalScenes,
  style,
  niche,
  children,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  children: ReactNode
}) {
  return (
    <CinematicStoryExperienceEngine
      sceneIndex={sceneIndex}
      totalScenes={totalScenes}
      style={style}
      niche={niche}
    >
      <CinematicStorytellingContinuityLayer>
        <CinematicStorytellingIdentityLayer>
          <CinematicStoryUniverseLayer>
            <CinematicStorytellingOperatingLayer>
              <LiveCinematicStack
                sceneIndex={sceneIndex}
                totalScenes={totalScenes}
                style={style}
                niche={niche}
              >
                {children}
              </LiveCinematicStack>
            </CinematicStorytellingOperatingLayer>
          </CinematicStoryUniverseLayer>
        </CinematicStorytellingIdentityLayer>
      </CinematicStorytellingContinuityLayer>
    </CinematicStoryExperienceEngine>
  )
}
