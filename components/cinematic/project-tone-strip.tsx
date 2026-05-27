'use client'

import { useMemo } from 'react'
import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { PacingPresenceChip } from '@/components/cinematic/pacing-presence-chip'
import { EmotionalToneIndicator } from '@/components/cinematic/emotional-tone-indicator'
import { VisualRhythmChip } from '@/components/cinematic/visual-rhythm-chip'
import { cn } from '@/lib/utils'

export function ProjectToneStrip({
  style,
  niche,
  className,
}: {
  style?: string | null
  niche?: string | null
  className?: string
}) {
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2 mb-5 sm:mb-6',
        className
      )}
      role="group"
      aria-label="Project tone and pacing"
    >
      <PacingPresenceChip label={identity.pacing} />
      <EmotionalToneIndicator label={identity.tone} />
      <VisualRhythmChip label={identity.rhythm} />
    </div>
  )
}
