'use client'

import type { ReactNode } from 'react'
import { CinematicSessionRestore } from '@/components/cinematic/cinematic-session-restore'
import { MomentumReturnGlow } from '@/components/cinematic/momentum-return-glow'
import { CinematicReturnEnvironment } from '@/components/cinematic/cinematic-return-environment'
import { DirectingSessionPresence } from '@/components/cinematic/directing-session-presence'
import { CinematicReturnImmersion } from '@/components/cinematic/legacy-archive/cinematic-return-immersion'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function EmotionalResumeLayer({
  children,
  status,
  style,
  niche,
  seed = 0,
  className,
}: {
  children: ReactNode
  status: CinematicProjectStatus | string
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3 mb-6', className)}>
      <CinematicReturnImmersion status={status} style={style} niche={niche} seed={seed} />
      <DirectingSessionPresence status={status} seed={seed} className="text-center sm:text-left hidden sm:block" />
      <CinematicSessionRestore status={status} style={style} seed={seed} className="hidden sm:block" />
      <CinematicReturnEnvironment style={style} niche={niche} seed={seed}>
        <MomentumReturnGlow>{children}</MomentumReturnGlow>
      </CinematicReturnEnvironment>
    </div>
  )
}
