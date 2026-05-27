'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { getStoryboardWorldHeadline, getProductionPresenceLine } from '@/lib/creator/visual-production-copy'
import { getStoryWorldHeadline } from '@/lib/creator/story-world-copy'
import { getEmotionalSequenceHeadline } from '@/lib/creator/emotional-sequence-copy'
import { getDirectorialPresenceHeadline } from '@/lib/creator/directorial-presence-copy'
import { getAuthorshipImmersionHeadline } from '@/lib/creator/authorship-immersion-copy'
import { getLegacyArchiveHeadline } from '@/lib/creator/legacy-archive-copy'
import { getCinematicDeliveryHeadline } from '@/lib/creator/cinematic-delivery-copy'
import { getCinematicShowcaseHeadline } from '@/lib/creator/cinematic-showcase-copy'
import { getStoryEvolutionHeadline } from '@/lib/creator/cinematic-story-evolution-copy'
import { getLiveCinematicHeadline } from '@/lib/creator/live-cinematic-copy'
import { CinematicVisualThread } from '@/components/cinematic/cinematic-visual-thread'
import { VisualStoryFlow } from '@/components/cinematic/visual-story-flow'
import { CinematicReferenceStrip } from '@/components/cinematic/cinematic-reference-strip'
import {
  CinematicVisualAtmosphere,
  StoryboardDepthEnvironment,
  VisualProductionPresence,
} from '@/components/cinematic/cinematic-visual-atmosphere'
import { StoryboardPresenceFade } from '@/components/cinematic/storyboard-presence-fade'
import { cn } from '@/lib/utils'

export function VisualSequenceAtmosphere({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1 py-2', className)} role="status">
      <CinematicVisualThread style={style} niche={niche} seed={seed} />
      <VisualStoryFlow style={style} niche={niche} seed={seed + 1} />
    </div>
  )
}

export function EmotionalFrameComposer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative cinematic-composition-weight', className)}>
      <div
        className="pointer-events-none absolute inset-0 emotional-frame-glow rounded-2xl"
        aria-hidden
      />
      {children}
    </div>
  )
}

export function StoryboardFocusEnvironment({
  children,
  active = false,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden calm-opacity-transition',
        active ? 'production-frame-focus storyboard-atmosphere-layer' : 'opacity-90',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CinematicStoryboardWorld({
  sceneCount,
  scenes,
  style,
  niche,
  activeIndex,
  children,
  className,
}: {
  sceneCount: number
  scenes: Array<{ index: number; title?: string }>
  style?: string | null
  niche?: string | null
  activeIndex?: number
  children?: ReactNode
  className?: string
}) {
  const headline = useMemo(
    () => getStoryboardWorldHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )
  const presenceLine = useMemo(
    () => getProductionPresenceLine(sceneCount % 3),
    [sceneCount]
  )

  const storyWorldLine = useMemo(
    () => getStoryWorldHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const emotionalSequenceLine = useMemo(
    () => getEmotionalSequenceHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const directorialPresenceLine = useMemo(
    () => getDirectorialPresenceHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const authorshipImmersionLine = useMemo(
    () => getAuthorshipImmersionHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const legacyArchiveLine = useMemo(
    () => getLegacyArchiveHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const deliveryHeadline = useMemo(
    () => getCinematicDeliveryHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const showcaseHeadline = useMemo(
    () => getCinematicShowcaseHeadline(sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const operatingHeadline = useMemo(
    () => getStoryEvolutionHeadline('operating', sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  const finalFilmHeadline = useMemo(
    () => getLiveCinematicHeadline('final', sceneCount, style, niche),
    [sceneCount, style, niche]
  )

  return (
    <StoryboardPresenceFade
      className={cn(
        'relative mb-4 sm:mb-5 rounded-2xl border border-white/[0.05] bg-black/25 px-3 py-3 sm:py-4 cinematic-visual-depth overflow-hidden',
        className
      )}
    >
      <CinematicVisualAtmosphere />
      <StoryboardDepthEnvironment />
      <div className="relative z-[1]">
        <p className="text-[8px] sm:text-[9px] tracking-[0.28em] uppercase text-[#C8A24E]/65 text-center mb-1">
          {headline}
        </p>
        <p className="text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/42 text-center mb-2 visual-world-opacity">
          {storyWorldLine}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-white/28 text-center mb-2 emotional-sequence-depth hidden sm:block">
          {emotionalSequenceLine}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/36 text-center mb-2 directorial-presence-depth hidden md:block">
          {directorialPresenceLine}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-white/26 text-center mb-2 authorship-immersion-depth hidden lg:block">
          {authorshipImmersionLine}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/32 text-center mb-2 legacy-archive-depth hidden xl:block">
          {legacyArchiveLine}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-white/24 text-center mb-2 cinematic-viewing-depth hidden xl:block">
          {deliveryHeadline}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/34 text-center mb-2 cinematic-showcase-depth hidden 2xl:block">
          {showcaseHeadline}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-white/18 text-center mb-2 story-operating-layer hidden 2xl:block">
          {operatingHeadline}
        </p>
        <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/30 text-center mb-2 live-final-os-depth hidden 2xl:block">
          {finalFilmHeadline}
        </p>
        <VisualProductionPresence line={presenceLine} className="mb-2" />
        <VisualSequenceAtmosphere style={style} niche={niche} seed={sceneCount % 3} />
        <CinematicReferenceStrip
          scenes={scenes}
          activeIndex={activeIndex}
          className="mt-3 hidden sm:flex"
        />
        {children}
      </div>
    </StoryboardPresenceFade>
  )
}
