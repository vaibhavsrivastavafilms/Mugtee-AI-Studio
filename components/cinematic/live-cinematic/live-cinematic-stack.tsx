'use client'

import type { ReactNode } from 'react'
import { CinematicMotionEngine } from '@/components/cinematic/live-cinematic/cinematic-motion-engine'
import {
  CinematicVideoLayer,
  CinematicAudioLayer,
  CinematicFilmExperienceLayer,
  CinematicDistributionLayer,
  LiveStorytellingEcosystemLayer,
  FinalCinematicOperatingLayer,
} from '@/components/cinematic/live-cinematic/live-cinematic-layers'

/**
 * Phases 5.1 → 10 — composes inside storytelling operating layer.
 * Motion engine carries restrained presence; inner phases are class-only depth.
 */
export function LiveCinematicStack({
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
    <CinematicMotionEngine
      sceneIndex={sceneIndex}
      totalScenes={totalScenes}
      style={style}
      niche={niche}
    >
      <CinematicVideoLayer>
        <CinematicAudioLayer>
          <CinematicFilmExperienceLayer>
            <CinematicDistributionLayer>
              <LiveStorytellingEcosystemLayer>
                <FinalCinematicOperatingLayer>{children}</FinalCinematicOperatingLayer>
              </LiveStorytellingEcosystemLayer>
            </CinematicDistributionLayer>
          </CinematicFilmExperienceLayer>
        </CinematicAudioLayer>
      </CinematicVideoLayer>
    </CinematicMotionEngine>
  )
}
