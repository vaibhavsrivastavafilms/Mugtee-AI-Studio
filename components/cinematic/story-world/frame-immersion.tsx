'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { getShotPresenceLine, getVisualStoryDepthLine } from '@/lib/creator/story-world-copy'
import { CinematicWorldBreathing } from '@/components/cinematic/story-world/micro-motion'
import { cn } from '@/lib/utils'

export function EmotionalFrameEnvironment({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 emotional-atmosphere-glow opacity-50',
        className
      )}
      aria-hidden
    />
  )
}

export function CinematicShotPresence({
  sceneIndex,
  seed = 0,
  className,
}: {
  sceneIndex: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getShotPresenceLine(sceneIndex, seed),
    [sceneIndex, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/45',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualStoryDepth({
  seed = 0,
  className,
}: {
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getVisualStoryDepthLine(seed), [seed])

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/26 hidden sm:block visual-story-breathing',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function ImmersiveFrameComposition({
  sceneIndex = 0,
  seed = 0,
  className,
  children,
}: {
  sceneIndex?: number
  seed?: number
  className?: string
  children: ReactNode
}) {
  const framePresence = useMemo(
    () => getShotPresenceLine(sceneIndex, seed),
    [sceneIndex, seed]
  )

  return (
    <div
      className={cn('relative cinematic-frame-environment', className)}
      aria-label={framePresence}
    >
      <CinematicWorldBreathing
        style={{ animationDelay: `${seed * 0.35}s` }}
      />
      <EmotionalFrameEnvironment />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
