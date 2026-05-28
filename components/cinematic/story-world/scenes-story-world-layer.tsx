'use client'

import { useMemo, type ReactNode } from 'react'
import { optimizeAtmosphereRender } from '@/lib/cinematic/execution/cinematic-performance-engine'
import { getSceneWorldContinuityLine } from '@/lib/creator/scene-world-continuity'
import { CinematicWorldComposition } from '@/components/cinematic/story-world/global-atmosphere'
import {
  EmotionalSceneWorld,
  CinematicAtmosphereThread,
  CinematicWorldRhythm,
} from '@/components/cinematic/story-world/scene-world-continuity'
import {
  CinematicStoryFlow,
  EmotionalAtmosphereSequence,
  VisualRhythmEnvironment,
} from '@/components/cinematic/story-world/story-flow'
import { VisualWorldMemory } from '@/components/cinematic/story-world/visual-memory'
import { VisualWorldPresenceFade } from '@/components/cinematic/story-world/micro-motion'
import { cn } from '@/lib/utils'

export function ScenesStoryWorldAtmosphere({
  sceneCount,
  style,
  niche,
  className,
}: {
  sceneCount: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const seed = sceneCount % 3
  const continuityLine = useMemo(
    () => getSceneWorldContinuityLine(1, sceneCount, style, niche, seed),
    [sceneCount, style, niche, seed]
  )

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border border-white/[0.04] bg-black/15 px-4 py-2.5 text-center',
        className
      )}
      role="status"
    >
      <VisualWorldMemory style={style} niche={niche} seed={seed} className="justify-center mb-1.5" />
      <p className="text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/55 mb-2">
        {continuityLine}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <EmotionalSceneWorld style={style} niche={niche} seed={seed} />
        <CinematicAtmosphereThread style={style} niche={niche} seed={seed + 1} />
        <CinematicWorldRhythm style={style} niche={niche} />
        <CinematicStoryFlow seed={seed} />
        <EmotionalAtmosphereSequence sceneIndex={1} seed={seed} />
        <VisualRhythmEnvironment style={style} niche={niche} seed={seed} />
      </div>
    </div>
  )
}

export function ScenesStoryWorldShell({
  sceneCount,
  style,
  niche,
  children,
  className,
}: {
  sceneCount: number
  style?: string | null
  niche?: string | null
  children: ReactNode
  className?: string
}) {
  const { preferReducedLayers } = optimizeAtmosphereRender()

  return (
    <VisualWorldPresenceFade className={cn('relative', className)}>
      <CinematicWorldComposition
        className={cn(
          'rounded-2xl',
          preferReducedLayers && 'cinematic-reduced-layers'
        )}
      >
        {sceneCount > 0 ? (
          <ScenesStoryWorldAtmosphere sceneCount={sceneCount} style={style} niche={niche} />
        ) : null}
        {children}
      </CinematicWorldComposition>
    </VisualWorldPresenceFade>
  )
}
