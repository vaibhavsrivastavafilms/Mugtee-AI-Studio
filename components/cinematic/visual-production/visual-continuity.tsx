'use client'

import { useMemo } from 'react'
import {
  getVisualThreadLine,
  getEmotionalColorPresence,
  getVisualRhythmSequence,
  getAtmosphereBridgeLine,
} from '@/lib/creator/visual-production-copy'
import { cn } from '@/lib/utils'

export function CinematicVisualThread({
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
    () => getVisualThreadLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/45 visual-sequence-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalColorPresence({
  scene,
  style,
  niche,
  seed = 0,
  className,
}: {
  scene?: { colorPalette?: string; emotion?: string } | null
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEmotionalColorPresence(scene ?? undefined, style, niche, seed),
    [scene, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 emotional-storyboard-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualRhythmSequence({
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
    () => getVisualRhythmSequence(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicAtmosphereBridge({
  sceneIndex,
  totalScenes,
  style,
  niche,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getAtmosphereBridgeLine(sceneIndex, totalScenes, style, niche),
    [sceneIndex, totalScenes, style, niche]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/38 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
