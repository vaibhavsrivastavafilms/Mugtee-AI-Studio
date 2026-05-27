'use client'

import type { ReactNode } from 'react'
import { CompletionPresence } from '@/components/cinematic/export/completion-presence'
import { DirectedLegacyPresence } from '@/components/cinematic/directing-legacy-presence'
import { EmotionalSequenceFinalization } from '@/components/cinematic/emotional-sequence-finalization'
import { CinematicDeliveryAtmosphere } from '@/components/cinematic/cinematic-delivery-atmosphere'
import { VisualExportClosure } from '@/components/cinematic/visual-production/visual-export-closure'
import { StoryWorldExportClosure } from '@/components/cinematic/story-world/story-world-export'
import { EmotionalSequenceExportClosure } from '@/components/cinematic/emotional-sequence/emotional-sequence-export'
import { DirectorialPresenceExportClosure } from '@/components/cinematic/directorial-presence/directorial-presence-export'
import { AuthorshipExportClosure } from '@/components/cinematic/authorship-export-closure'
import { LegacyArchiveExportClosure } from '@/components/cinematic/legacy-archive/legacy-archive-export'
import { CinematicDeliveryExportClosure } from '@/components/cinematic/cinematic-delivery/delivery-export-closure'
import { CinematicShowcaseExportClosure } from '@/components/cinematic/cinematic-showcase/showcase-export-closure'
import {
  StoryExperienceExportClosure,
  ViewingExportClosure,
} from '@/components/cinematic/story-evolution/story-evolution-export'
import {
  LiveMotionExportClosure,
  LiveFilmExportClosure,
} from '@/components/cinematic/live-cinematic/live-cinematic-export'
import { cn } from '@/lib/utils'

export function CinematicExportClosure({
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
  return (
    <CompletionPresence className={cn('cinematic-master-atmosphere cinematic-visual-depth', className)}>
      <CinematicDeliveryAtmosphere seed={seed} style={style} niche={niche} className="mb-3" />
      <VisualExportClosure style={style} niche={niche} seed={seed} className="mb-3 w-full" />
      <StoryWorldExportClosure style={style} niche={niche} seed={seed + 1} className="mb-3 w-full" />
      <EmotionalSequenceExportClosure style={style} niche={niche} seed={seed + 2} className="mb-3 w-full hidden sm:block" />
      <DirectorialPresenceExportClosure style={style} niche={niche} seed={seed + 3} className="mb-3 w-full hidden md:block" />
      <AuthorshipExportClosure style={style} niche={niche} seed={seed + 4} className="mb-3 w-full hidden lg:block" />
      <LegacyArchiveExportClosure style={style} niche={niche} seed={seed + 5} className="mb-3 w-full hidden xl:block" />
      <CinematicDeliveryExportClosure style={style} niche={niche} seed={seed + 6} className="mb-3 w-full hidden xl:block" />
      <CinematicShowcaseExportClosure style={style} niche={niche} seed={seed + 7} className="mb-3 w-full hidden 2xl:block" />
      <StoryExperienceExportClosure style={style} niche={niche} seed={seed + 8} className="mb-3 w-full hidden 2xl:block" />
      <ViewingExportClosure style={style} niche={niche} seed={seed + 9} className="mb-3 w-full hidden 2xl:block" />
      <LiveMotionExportClosure style={style} niche={niche} seed={seed + 10} className="mb-3 w-full hidden 2xl:block" />
      <LiveFilmExportClosure style={style} niche={niche} seed={seed + 11} className="mb-3 w-full hidden 2xl:block" />
      <DirectedLegacyPresence style={style} niche={niche} seed={seed} className="mb-2" />
      <EmotionalSequenceFinalization style={style} niche={niche} seed={seed + 1} className="mb-6" />
      {children}
    </CompletionPresence>
  )
}
