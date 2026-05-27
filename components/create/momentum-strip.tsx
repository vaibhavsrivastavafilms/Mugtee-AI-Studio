'use client'

import { CreatorMomentumBanner } from '@/components/create/creator-momentum-banner'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

export function MomentumStrip({
  stage,
  seed = 0,
  style,
  subtitle,
}: {
  stage: CinematicProjectStatus | string
  seed?: number
  style?: string | null
  subtitle?: string
}) {
  return (
    <CreatorMomentumBanner
      stage={stage}
      seed={seed}
      style={style}
      subtitle={subtitle}
    />
  )
}
