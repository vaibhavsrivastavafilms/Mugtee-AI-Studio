'use client'

import type { ReactNode } from 'react'
import {
  AuthorshipIdentityAnchor,
  EmotionalOwnershipPresence,
  CinematicSignatureAtmosphere,
  VisualStorytellingConfidence,
  AuthoredContinuityThread,
  SignatureMemoryEcho,
  AuthorshipContinuityPresence,
} from '@/components/cinematic/authorship-immersion/authorship-immersion-core'
import { LegacyArchivePresenceEnhancement } from '@/components/cinematic/legacy-archive/legacy-archive-enhancement'
import { cn } from '@/lib/utils'

/**
 * Phase 3.4 + 3.5 — composes inside DirectorialPresenceEnhancement around storyboard content.
 * Authorship immersion with legacy archive presence on storyboard body.
 */
export function AuthorshipPresenceEnhancement({
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
    <div className={cn('relative authorship-immersion-depth', className)}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-0.5 border-b border-white/[0.02]"
        role="status"
      >
        <AuthorshipIdentityAnchor
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
        />
        <EmotionalOwnershipPresence style={style} niche={niche} seed={seed} />
        <CinematicSignatureAtmosphere style={style} niche={niche} seed={seed} />
      </div>

      <LegacyArchivePresenceEnhancement
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
      >
        {children}
      </LegacyArchivePresenceEnhancement>

      <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-0.5 border-t border-white/[0.02]">
        <VisualStorytellingConfidence style={style} niche={niche} seed={seed} />
        <AuthoredContinuityThread
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          style={style}
          seed={seed}
        />
        <SignatureMemoryEcho style={style} niche={niche} seed={seed} />
        <AuthorshipContinuityPresence
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
          className="sm:ml-auto"
        />
      </div>
    </div>
  )
}
