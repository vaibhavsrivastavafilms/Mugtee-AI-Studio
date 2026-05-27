'use client'

import { useMemo } from 'react'
import {
  getCameraDirectionLine,
  getCompositionGuideLine,
  getLightingPresenceLine,
  getMovementIndicatorLine,
} from '@/lib/creator/visual-production-copy'
import type { CinematicScene } from '@/stores/cinematic-project'
import { CinematicVisualPulse } from '@/components/cinematic/cinematic-visual-pulse'
import { cn } from '@/lib/utils'

export function CinematicCameraDirection({
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
    () => getCameraDirectionLine(scene, style, seed),
    [scene, style, seed]
  )

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/55 cinematic-lighting-presence',
        className
      )}
      role="status"
    >
      <CinematicVisualPulse />
      {line}
    </p>
  )
}

export function VisualCompositionGuide({
  scene,
  seed = 0,
  className,
}: {
  scene?: CinematicScene | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getCompositionGuideLine(scene, seed),
    [scene, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/32',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalLightingPresence({
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
    () => getLightingPresenceLine(scene, style, seed),
    [scene, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-white/35 emotional-storyboard-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicMovementIndicator({
  scene,
  seed = 0,
  className,
}: {
  scene?: CinematicScene | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getMovementIndicatorLine(scene, seed),
    [scene, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/42 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualDirectionComposer({
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
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 px-3 py-2 border-t border-white/[0.04] bg-black/15',
        className
      )}
    >
      <CinematicCameraDirection scene={scene} style={style} seed={seed} />
      <EmotionalLightingPresence scene={scene} style={style} seed={seed + 1} />
      <CinematicMovementIndicator scene={scene} seed={seed + 2} className="sm:ml-auto" />
      <VisualCompositionGuide scene={scene} seed={seed} className="w-full sm:w-auto hidden sm:block" />
    </div>
  )
}
