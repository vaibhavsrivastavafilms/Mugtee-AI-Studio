'use client'

import { useMemo } from 'react'
import { getMomentumBannerLines } from '@/lib/creator/momentum-lines'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { MomentumTransition } from '@/components/cinematic/momentum-transition'
import { WorkflowEnergyPulse } from '@/components/cinematic/workflow-energy-pulse'
import { cn } from '@/lib/utils'

export function CreatorMomentumBanner({
  stage,
  seed = 0,
  style,
  subtitle,
  className,
}: {
  stage: CinematicProjectStatus | string
  seed?: number
  style?: string | null
  subtitle?: string
  className?: string
}) {
  const { headline, reassurance } = useMemo(
    () => getMomentumBannerLines(stage, seed, style),
    [stage, seed, style]
  )

  return (
    <MomentumTransition className={cn('mb-5 sm:mb-6', className)}>
      <div
        className="relative rounded-xl border border-white/[0.05] bg-gradient-to-r from-[#2B1A08]/30 via-black/10 to-[#2B1A08]/20 px-4 py-3 sm:py-3.5 text-center workflow-presence-glow overflow-hidden"
        role="status"
      >
        <WorkflowEnergyPulse active className="absolute top-3 right-3 sm:top-3.5 sm:right-4" />
        <p className="text-[10px] tracking-[0.22em] uppercase text-[#C8A24E]/75 px-6">
          {headline}
        </p>
        <p className="mt-1.5 text-[9px] tracking-[0.18em] uppercase text-white/28 px-4">
          {subtitle ?? reassurance}
        </p>
      </div>
    </MomentumTransition>
  )
}
