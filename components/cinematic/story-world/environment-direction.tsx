'use client'

import { useMemo } from 'react'
import {
  getEnvironmentDirectionLine,
  getLightingEnvironmentLine,
  getSpatialPresenceLine,
  getVisualMoodEnvironmentLine,
} from '@/lib/creator/story-world-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function CinematicEnvironmentDirection({
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
    () => getEnvironmentDirectionLine(scene ?? undefined, style, seed),
    [scene, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/50 cinematic-environment-focus',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalLightingEnvironment({
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
    () => getLightingEnvironmentLine(scene ?? undefined, style, seed),
    [scene, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/32 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicSpatialPresence({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getSpatialPresenceLine(seed), [seed])

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

export function VisualMoodEnvironment({
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
  const line = useMemo(
    () => getVisualMoodEnvironmentLine(scene ?? undefined, style, niche, seed),
    [scene, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/42',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EnvironmentDirectionStrip({
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
        'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-b border-white/[0.03] bg-black/10',
        className
      )}
      role="status"
    >
      <CinematicEnvironmentDirection scene={scene} style={style} seed={seed} />
      <VisualMoodEnvironment scene={scene} style={style} niche={niche} seed={seed} />
      <EmotionalLightingEnvironment scene={scene} style={style} seed={seed + 1} />
      <CinematicSpatialPresence seed={seed + 2} />
    </div>
  )
}
