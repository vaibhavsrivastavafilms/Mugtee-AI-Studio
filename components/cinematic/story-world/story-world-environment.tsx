'use client'

import { useMemo } from 'react'
import {
  getStoryWorldPresenceLine,
  getEnvironmentSequenceLine,
} from '@/lib/creator/story-world-copy'
import { cn } from '@/lib/utils'

export function EmotionalWorldAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 cinematic-storyworld-depth opacity-60',
        className
      )}
      aria-hidden
    />
  )
}

export function VisualWorldPresence({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/48 visual-world-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicEnvironmentSequence({
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
    () => getEnvironmentSequenceLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <VisualWorldPresence line={line} className={cn('hidden sm:block', className)} />
  )
}

export function CinematicStoryworldShell({
  sceneIndex,
  totalScenes,
  seed = 0,
  className,
  children,
}: {
  sceneIndex: number
  totalScenes: number
  seed?: number
  className?: string
  children: React.ReactNode
}) {
  const presenceLine = useMemo(
    () => getStoryWorldPresenceLine(seed + sceneIndex),
    [seed, sceneIndex]
  )

  return (
    <div
      className={cn(
        'relative cinematic-frame-environment storyworld-composition-weight',
        className
      )}
    >
      <EmotionalWorldAtmosphere />
      <div className="relative z-[1] px-3 pt-2 pb-1 border-b border-white/[0.03]">
        <VisualWorldPresence line={presenceLine} />
        <CinematicEnvironmentSequence
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
          className="mt-1"
        />
      </div>
      {children}
    </div>
  )
}
