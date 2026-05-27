'use client'

import { useMemo } from 'react'
import {
  getVisualWorldMemoryLine,
  getAtmosphereMemoryLine,
  getEmotionalSceneMemoryLine,
  getVisualContinuityMemoryLine,
} from '@/lib/creator/story-world-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { EmotionalAtmospherePulse } from '@/components/cinematic/story-world/micro-motion'
import { cn } from '@/lib/utils'

export function VisualWorldMemory({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualWorldMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/42 visual-world-opacity',
        className
      )}
      role="status"
    >
      <EmotionalAtmospherePulse />
      {line}
    </p>
  )
}

export function CinematicAtmosphereMemory({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getAtmosphereMemoryLine(style, niche),
    [style, niche]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalSceneMemory({
  scene,
  seed = 0,
  className,
}: {
  scene?: CinematicScene | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEmotionalSceneMemoryLine(scene ?? undefined, seed),
    [scene, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualContinuityMemory({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualContinuityMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/24 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualStoryMemoryStrip({
  scene,
  style,
  niche,
  seed = 0,
  className,
}: {
  scene?: CinematicScene | null
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-1 sm:gap-3 px-3 py-2 border-t border-white/[0.03]',
        className
      )}
    >
      <VisualWorldMemory style={style} niche={niche} seed={seed} />
      <EmotionalSceneMemory scene={scene} seed={seed} className="hidden sm:block" />
      <CinematicAtmosphereMemory style={style} niche={niche} />
      <VisualContinuityMemory style={style} niche={niche} seed={seed + 1} />
    </div>
  )
}
