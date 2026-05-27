'use client'

import type { ReactNode } from 'react'
import { EmotionalSceneDepth } from '@/components/cinematic/emotional-scene-depth'
import { CinematicSceneFocus } from '@/components/cinematic/cinematic-scene-focus'
import { cn } from '@/lib/utils'

export function AtmosphericSceneShell({
  children,
  active = false,
  intensity = 3,
  className,
}: {
  children: ReactNode
  active?: boolean
  intensity?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-[24px] border overflow-hidden scroll-mt-24 calm-opacity-transition visual-atmosphere-layer',
        active
          ? 'border-[#D4AF37]/20 storyboard-focus-halo pacing-awareness-glow'
          : 'border-white/10 bg-white/[0.03] storyboard-variant-inactive',
        className
      )}
    >
      <EmotionalSceneDepth active={active} intensity={intensity} />
      <CinematicSceneFocus active={active}>{children}</CinematicSceneFocus>
    </div>
  )
}
