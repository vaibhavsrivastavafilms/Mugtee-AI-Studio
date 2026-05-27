'use client'

import { useMemo } from 'react'
import {
  getCinematicStoryFlowLine,
  getEmotionalAtmosphereSequenceLine,
  getVisualRhythmEnvironmentLine,
  getSequencePresenceLine,
} from '@/lib/creator/story-world-copy'
import { cn } from '@/lib/utils'

export function CinematicStoryFlow({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getCinematicStoryFlowLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/30 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalAtmosphereSequence({
  sceneIndex,
  seed = 0,
  className,
}: {
  sceneIndex: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEmotionalAtmosphereSequenceLine(sceneIndex, seed),
    [sceneIndex, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/38',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualRhythmEnvironment({
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
    () => getVisualRhythmEnvironmentLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/26 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicSequencePresence({
  sceneIndex,
  totalScenes,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  className?: string
}) {
  const line = useMemo(
    () => getSequencePresenceLine(sceneIndex, totalScenes),
    [sceneIndex, totalScenes]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/45 sm:hidden',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
