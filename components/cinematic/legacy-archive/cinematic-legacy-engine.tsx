'use client'

import type { ReactNode } from 'react'
import { CreatorLegacyLayer } from '@/components/cinematic/legacy-archive/creator-legacy-layer'
import { CinematicLegacyFrame } from '@/components/cinematic/legacy-archive/cinematic-legacy-frame'
import { CinematicMemoryBreathing } from '@/components/cinematic/legacy-archive/legacy-micro-motion'
import { CinematicDeliveryViewingEnhancement } from '@/components/cinematic/cinematic-delivery/delivery-viewing-enhancement'
import {
  EmotionalArchivePresence,
  LegacyArchiveMobileAnchor,
  CinematicWorldPermanence,
  CreatorLegacyPresenceStrip,
  CinematicArchivePresence,
  EmotionalWorldRecall,
  CinematicAuthorshipContinuity,
  EmotionalSignatureContinuation,
  CinematicWorldMemory,
  LegacyContinuityStrip,
  EmotionalStoryPresence,
  VisualAuthorshipEcho,
} from '@/components/cinematic/legacy-archive/legacy-presence-components'
import { cn } from '@/lib/utils'

/**
 * Phase 3.5 legacy engine — permanence, archive atmosphere, authorship continuity.
 * One mobile line; restrained desktop presence; no stacked overlays.
 */
export function CinematicLegacyEngine({
  sceneIndex,
  totalScenes,
  style,
  niche,
  children,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  children: ReactNode
  className?: string
}) {
  const seed = sceneIndex % 3

  return (
    <CreatorLegacyLayer className={className}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-0.5 border-b border-white/[0.015]"
        role="status"
        aria-label="Cinematic legacy presence"
      >
        <EmotionalArchivePresence style={style} niche={niche} seed={seed} />
        <LegacyArchiveMobileAnchor
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
        />
        <CinematicWorldPermanence style={style} niche={niche} seed={seed} />
        <CreatorLegacyPresenceStrip style={style} niche={niche} seed={seed} />
        <CinematicArchivePresence style={style} niche={niche} seed={seed} />
        <EmotionalWorldRecall style={style} niche={niche} seed={seed} />
      </div>

      <CinematicLegacyFrame>
        <CinematicMemoryBreathing>
          <CinematicDeliveryViewingEnhancement
            sceneIndex={sceneIndex}
            totalScenes={totalScenes}
            style={style}
            niche={niche}
          >
            {children}
          </CinematicDeliveryViewingEnhancement>
        </CinematicMemoryBreathing>
      </CinematicLegacyFrame>

      <div
        className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-0.5 border-t border-white/[0.015]"
        role="status"
      >
        <EmotionalStoryPresence sceneIndex={sceneIndex} style={style} seed={seed} />
        <VisualAuthorshipEcho style={style} niche={niche} seed={seed} />
        <CinematicAuthorshipContinuity
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <EmotionalSignatureContinuation style={style} niche={niche} seed={seed} />
        <CinematicWorldMemory style={style} niche={niche} seed={seed} />
        <LegacyContinuityStrip
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
      </div>
    </CreatorLegacyLayer>
  )
}
