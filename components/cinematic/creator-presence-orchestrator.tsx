'use client'

import { useMemo } from 'react'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { CreatorMemoryStrip } from '@/components/cinematic/creator-memory-strip'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { CreatorProductionPresence } from '@/components/cinematic/creator-production-presence'
import { CinematicIdentityPresence } from '@/components/cinematic/cinematic-identity-presence'
import { EmotionalDirectingPresence } from '@/components/cinematic/emotional-directing-presence'
import { CreatorRhythmPresence } from '@/components/cinematic/creator-rhythm-presence'
import { cn } from '@/lib/utils'

export function CreatorPresenceOrchestrator({
  stage,
  style,
  niche,
  seed = 0,
  compact,
  className,
}: {
  stage: CinematicProjectStatus | string
  style?: string | null
  niche?: string | null
  seed?: number
  compact?: boolean
  className?: string
}) {
  const presenceSeed = useMemo(() => seed + (style?.length ?? 0), [seed, style])

  if (compact) {
    return (
      <div className={cn('space-y-2 mb-4', className)} role="status">
        <CinematicIdentityPresence style={style} niche={niche} />
        <CreatorRhythmPresence style={style} niche={niche} seed={presenceSeed} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2 mb-4 sm:mb-5', className)} role="status">
      <div className="hidden sm:block">
        <CreatorProductionPresence style={style} niche={niche} seed={presenceSeed} />
      </div>
      <CinematicIdentityPresence style={style} niche={niche} />
      <EmotionalDirectingPresence stage={stage} seed={presenceSeed} />
      <CreatorMemoryStrip style={style} niche={niche} seed={presenceSeed % 3} />
      <PacingIntelligenceStrip style={style} niche={niche} seed={presenceSeed} className="hidden sm:block" />
      <CreatorRhythmPresence style={style} niche={niche} seed={presenceSeed + 1} className="hidden sm:block" />
    </div>
  )
}
