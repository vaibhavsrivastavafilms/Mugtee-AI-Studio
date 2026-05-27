'use client'

import { useMemo } from 'react'
import {
  getEmotionalSceneWorldLine,
  getAtmosphereThreadLine,
  getVisualEmotionBridgeLine,
  getCinematicWorldRhythmLine,
} from '@/lib/creator/story-world-copy'
import { cn } from '@/lib/utils'

export function EmotionalSceneWorld({
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
    () => getEmotionalSceneWorldLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/32 emotional-sequence-atmosphere',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicAtmosphereThread({
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
    () => getAtmosphereThreadLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/40 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualEmotionBridge({
  sceneIndex,
  totalScenes,
  seed = 0,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualEmotionBridgeLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicWorldRhythm({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getCinematicWorldRhythmLine(style, niche),
    [style, niche]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/26 hidden sm:block visual-story-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
