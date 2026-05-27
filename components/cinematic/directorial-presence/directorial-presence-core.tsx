'use client'

import { useMemo } from 'react'
import {
  getDirectorialPresenceLine,
  getEditorialGuidanceAtmosphereLine,
  getVisualDirectingConfidenceLine,
  getEmotionalShotIntentionLine,
  getCreatorAuthorshipLine,
  getDirectorialRhythmLine,
  getShotIntentionContinuityLine,
  getDirectorialAtmosphereEchoLine,
} from '@/lib/creator/directorial-presence-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function DirectorialPresenceAnchor({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: {
  sceneIndex: number
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getDirectorialPresenceLine(sceneIndex, style, niche, seed),
    [sceneIndex, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/52 directorial-authorship-glow',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EditorialGuidanceAtmosphere({
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
    () => getEditorialGuidanceAtmosphereLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 editorial-guidance-opacity hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualDirectingConfidence({
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
    () => getVisualDirectingConfidenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28 directorial-rhythm-breathing hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalShotIntention({
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
    () => getEmotionalShotIntentionLine(scene ?? undefined, style, seed),
    [scene, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/40 shot-intention-presence hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CreatorAuthorshipPresence({
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
    () => getCreatorAuthorshipLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/38 directorial-authorship-glow hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function DirectorialRhythmThread({
  sceneIndex,
  totalScenes,
  style,
  seed = 0,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getDirectorialRhythmLine(sceneIndex, totalScenes, style, seed),
    [sceneIndex, totalScenes, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/26 directorial-rhythm-breathing hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function ShotIntentionContinuity({
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
    () => getShotIntentionContinuityLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
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

export function DirectorialAtmosphereEcho({
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
    () => getDirectorialAtmosphereEchoLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/24 editorial-guidance-opacity hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
