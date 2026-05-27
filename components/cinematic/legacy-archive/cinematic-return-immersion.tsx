'use client'

import {
  CinematicReturnPresence,
  EmotionalWorldReentry,
  AuthoredAtmosphereRecall,
  CinematicSessionContinuity,
} from '@/components/cinematic/legacy-archive/legacy-presence-components'
import { cn } from '@/lib/utils'

/** Return immersion — emotionally familiar reentry, no productivity phrasing. */
export function CinematicReturnImmersion({
  status,
  style,
  niche,
  seed = 0,
  className,
}: {
  status: string
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-1 mb-2', className)} role="status">
      <CinematicReturnPresence status={status} style={style} niche={niche} seed={seed} />
      <EmotionalWorldReentry style={style} niche={niche} seed={seed} />
      <AuthoredAtmosphereRecall style={style} niche={niche} seed={seed} />
      <CinematicSessionContinuity style={style} niche={niche} seed={seed} />
    </div>
  )
}
