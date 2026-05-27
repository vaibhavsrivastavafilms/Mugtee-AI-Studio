'use client'

import type { ReactNode } from 'react'
import type { CinematicScene } from '@/stores/cinematic-project'
import {
  DirectorialPresenceAnchor,
  EditorialGuidanceAtmosphere,
  VisualDirectingConfidence,
  EmotionalShotIntention,
  CreatorAuthorshipPresence,
  DirectorialRhythmThread,
  ShotIntentionContinuity,
  DirectorialAtmosphereEcho,
} from '@/components/cinematic/directorial-presence/directorial-presence-core'
import { AuthorshipPresenceEnhancement } from '@/components/cinematic/authorship-immersion/authorship-immersion-enhancement'
import { cn } from '@/lib/utils'

/**
 * Phase 3.3 + 3.4 — composes inside EmotionalSequenceEnhancement around storyboard content.
 * Directorial presence with authorship immersion on storyboard body.
 */
export function DirectorialPresenceEnhancement({
  sceneIndex,
  totalScenes,
  style,
  niche,
  scene,
  children,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  niche?: string | null
  scene?: CinematicScene | null
  children: ReactNode
  className?: string
}) {
  const seed = sceneIndex % 3

  return (
    <div className={cn('relative directorial-presence-depth', className)}>
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1 border-b border-white/[0.025]"
        role="status"
      >
        <DirectorialPresenceAnchor
          sceneIndex={sceneIndex}
          style={style}
          niche={niche}
          seed={seed}
        />
        <EmotionalShotIntention scene={scene} style={style} seed={seed} />
        <EditorialGuidanceAtmosphere style={style} niche={niche} seed={seed} />
      </div>

      <AuthorshipPresenceEnhancement
        sceneIndex={sceneIndex}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
      >
        {children}
      </AuthorshipPresenceEnhancement>

      <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 border-t border-white/[0.025]">
        <VisualDirectingConfidence style={style} niche={niche} seed={seed} />
        <DirectorialRhythmThread
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          style={style}
          seed={seed}
        />
        <ShotIntentionContinuity
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          seed={seed}
        />
        <DirectorialAtmosphereEcho style={style} niche={niche} seed={seed} />
        <CreatorAuthorshipPresence
          style={style}
          niche={niche}
          seed={seed}
          className="sm:ml-auto"
        />
      </div>
    </div>
  )
}
