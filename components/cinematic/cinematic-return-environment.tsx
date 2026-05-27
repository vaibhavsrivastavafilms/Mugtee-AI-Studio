'use client'

import type { ReactNode } from 'react'
import { getEnvironmentReturnLine } from '@/lib/creator/operating-presence-copy'
import { CreatorEnvironmentMemory } from '@/components/cinematic/creator-environment-memory'
import { EmotionalEnvironmentGlow } from '@/components/cinematic/emotional-environment-glow'
import { cn } from '@/lib/utils'

export function CinematicReturnEnvironment({
  children,
  style,
  niche,
  seed = 0,
  className,
}: {
  children: ReactNode
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const returnLine = getEnvironmentReturnLine(seed)

  return (
    <EmotionalEnvironmentGlow
      className={cn('rounded-2xl border border-[#D4AF37]/10 p-1 immersive-environment-fade', className)}
    >
      <p
        className="text-[9px] tracking-[0.24em] uppercase text-[#C8A24E]/70 text-center px-3 pt-3 pb-2"
        role="status"
      >
        {returnLine}
      </p>
      <CreatorEnvironmentMemory style={style} niche={niche} className="pb-2" />
      {children}
    </EmotionalEnvironmentGlow>
  )
}
