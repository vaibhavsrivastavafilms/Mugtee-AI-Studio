'use client'

import { useMemo } from 'react'
import {
  getEscalationPresenceLine,
  getAtmosphereProgressionLine,
  getEmotionalVisualRhythmLine,
  getSceneSequenceFlowLine,
  getEmotionalSequenceBridgeLine,
  getCinematicEscalationThreadLine,
  getSequenceAtmosphereProgressionLine,
  getEmotionalFlowContinuityLine,
  getSequenceMemoryLine,
} from '@/lib/creator/emotional-sequence-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function EmotionalEscalationPresence({
  sceneIndex,
  totalScenes,
  style,
  niche,
  seed = 0,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEscalationPresenceLine(sceneIndex, totalScenes, style, niche, seed),
    [sceneIndex, totalScenes, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/50 cinematic-escalation-presence',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function AtmosphereProgressionThread({
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
    () => getAtmosphereProgressionLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 atmosphere-progression-opacity hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalVisualRhythm({
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
    () => getEmotionalVisualRhythmLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/28 emotional-flow-rhythm hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function SceneSequenceFlow({
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
    () => getSceneSequenceFlowLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/42 sm:hidden',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalSequenceBridge({
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
    () => getEmotionalSequenceBridgeLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
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

export function CinematicEscalationThread({
  scene,
  style,
  seed = 0,
  className,
}: {
  scene?: CinematicScene | null
  style?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getCinematicEscalationThreadLine(scene ?? undefined, style, seed),
    [scene, style, seed]
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

export function SequenceAtmosphereProgression({
  sceneIndex,
  style,
  niche,
  className,
}: {
  sceneIndex: number
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const line = useMemo(
    () => getSequenceAtmosphereProgressionLine(sceneIndex, style, niche),
    [sceneIndex, style, niche]
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

export function EmotionalFlowContinuity({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getEmotionalFlowContinuityLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/26 sequence-continuity-breathing hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function SequenceMemoryPresence({
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
    () => getSequenceMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/38 emotional-sequence-depth',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
