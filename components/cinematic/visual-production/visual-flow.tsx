'use client'

import { useMemo } from 'react'
import {
  getVisualSequenceFlowLine,
  getSceneTransitionLine,
  getFrameRhythmLine,
  getVisualStoryFlowLine,
} from '@/lib/creator/visual-production-copy'
import { cn } from '@/lib/utils'

export function VisualSequenceFlow({
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
    () => getVisualSequenceFlowLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/32 visual-sequence-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicSceneTransition({
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
    () => getSceneTransitionLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
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

export function EmotionalFrameRhythm({
  sceneIndex,
  seed = 0,
  className,
}: {
  sceneIndex: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getFrameRhythmLine(sceneIndex, seed),
    [sceneIndex, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28 emotional-storyboard-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualStoryFlow({
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
    () => getVisualStoryFlowLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/42 text-center',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
