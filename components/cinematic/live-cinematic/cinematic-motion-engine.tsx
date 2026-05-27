'use client'

import type { ReactNode } from 'react'
import { ImmersiveMotionEnvironment } from '@/components/cinematic/live-cinematic/live-cinematic-frame'
import { MotionBreathing } from '@/components/cinematic/live-cinematic/live-cinematic-micro-motion'
import {
  MotionMobileAnchor,
  EmotionalMotionPresence,
  EmotionalSceneFlow,
  CinematicTransitionPresence,
  CinematicMotionRhythm,
  EmotionalRenderPresence,
  EmotionalFilmFlow,
  EmotionalVoicePresence,
  FilmExperiencePresence,
  EcosystemPresence,
  FinalOperatingPresence,
  VisualMotionContinuity,
} from '@/components/cinematic/live-cinematic/live-cinematic-presence-components'
import { cn } from '@/lib/utils'

/** Phase 5.1 — live motion with restrained presence; mobile line only when visible. */
export function CinematicMotionEngine({
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
    <div className={cn('relative live-motion-depth live-motion-layer', className)}>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 border-b border-white/[0.006]"
        role="status"
        aria-label="Live cinematic motion"
      >
        <MotionMobileAnchor sceneIndex={sceneIndex} style={style} niche={niche} seed={seed} className="hidden" />
        <EmotionalMotionPresence style={style} niche={niche} seed={seed} />
        <EmotionalSceneFlow style={style} niche={niche} seed={seed} />
        <CinematicTransitionPresence seed={seed} />
      </div>

      <ImmersiveMotionEnvironment>
        <MotionBreathing>{children}</MotionBreathing>
      </ImmersiveMotionEnvironment>

      <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 border-t border-white/[0.006]" role="status">
        <CinematicMotionRhythm sceneIndex={sceneIndex} totalScenes={totalScenes} seed={seed} />
        <EmotionalRenderPresence style={style} niche={niche} seed={seed} />
        <EmotionalFilmFlow style={style} niche={niche} seed={seed} />
        <EmotionalVoicePresence style={style} niche={niche} seed={seed} />
        <FilmExperiencePresence style={style} niche={niche} seed={seed} />
        <EcosystemPresence style={style} niche={niche} seed={seed} />
        <FinalOperatingPresence style={style} niche={niche} seed={seed} />
        <VisualMotionContinuity sceneIndex={sceneIndex} totalScenes={totalScenes} seed={seed} />
      </div>
    </div>
  )
}
