'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { getProductionPresenceLine } from '@/lib/creator/visual-production-copy'
import {
  CinematicVisualAtmosphere,
  StoryboardDepthEnvironment,
  VisualProductionPresence,
  EmotionalFrameOverlay,
} from '@/components/cinematic/cinematic-visual-atmosphere'
import { StoryboardPresenceFade } from '@/components/cinematic/storyboard-presence-fade'
import { EmotionalColorPresence } from '@/components/cinematic/emotional-color-presence'
import { VisualRhythmSequence } from '@/components/cinematic/visual-rhythm-sequence'
import { VisualSequenceFlow } from '@/components/cinematic/visual-sequence-flow'
import { CinematicAtmosphereBridge } from '@/components/cinematic/cinematic-atmosphere-bridge'
import { StoryWorldImmersionLayer } from '@/components/cinematic/story-world/story-world-immersion-layer'
import { cn } from '@/lib/utils'

export function StoryboardProductionEnvironment({
  children,
  seed = 0,
  className,
}: {
  children: ReactNode
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getProductionPresenceLine(seed), [seed])

  return (
    <StoryboardPresenceFade
      className={cn('relative cinematic-visual-depth overflow-hidden', className)}
    >
      <CinematicVisualAtmosphere />
      <StoryboardDepthEnvironment />
      <EmotionalFrameOverlay />
      <div className="relative z-[1]">
        <VisualProductionPresence line={line} className="py-2 px-3 border-b border-white/[0.04]" />
        {children}
      </div>
    </StoryboardPresenceFade>
  )
}

export function CinematicSceneProduction({
  sceneIndex,
  totalScenes,
  style,
  niche,
  scene,
  children,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  scene?: import('@/stores/cinematic-project').CinematicScene | null
  children: ReactNode
  className?: string
}) {
  return (
    <StoryboardProductionEnvironment seed={sceneIndex} className={className}>
      <StoryWorldImmersionLayer
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
        scene={scene}
      >
        {children}
      </StoryWorldImmersionLayer>
      {scene ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 border-t border-white/[0.04] bg-black/10">
          <VisualRhythmSequence
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            seed={sceneIndex}
            className="hidden sm:block"
          />
          <VisualSequenceFlow
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            seed={sceneIndex}
          />
          <CinematicAtmosphereBridge
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            style={style}
            niche={niche}
            className="hidden sm:block"
          />
          <EmotionalColorPresence
            scene={scene}
            style={style}
            niche={niche}
            seed={sceneIndex + 1}
            className="sm:ml-auto"
          />
        </div>
      ) : null}
    </StoryboardProductionEnvironment>
  )
}

export function CinematicVisualProductionShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative space-y-4 storyboard-atmosphere-layer', className)}>
      <CinematicVisualAtmosphere className="rounded-2xl" />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
