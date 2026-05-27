'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getWorkflowPresenceLine } from '@/lib/creator/master-cinematic-copy'
import { getProductionThreadLine } from '@/lib/creator/operating-presence-copy'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { DirectingPresencePulse } from '@/components/cinematic/directing-presence-pulse'
import {
  AuthoredMemoryAtmosphere,
  EmotionalWorldPresence,
  CinematicPreservationRhythm,
} from '@/components/cinematic/legacy-archive/legacy-presence-components'
import {
  EmotionalPresentationPresence,
  CinematicPremiereRhythm,
} from '@/components/cinematic/cinematic-delivery/delivery-presence-components'
import {
  ShowcaseEmotionalPresentationPresence,
  CinematicPremiereContinuity,
} from '@/components/cinematic/cinematic-showcase/showcase-presence-components'
import { CinematicOperatingPresence } from '@/components/cinematic/story-evolution/story-evolution-presence-components'
import { FinalOperatingPresence } from '@/components/cinematic/live-cinematic/live-cinematic-presence-components'
import { cn } from '@/lib/utils'

export function EmotionalWorkflowPresence({ className }: { className?: string }) {
  const { style, niche, projectTitle, status } = useCinematicProjectStore(
    useShallow((s) => ({
      style: s.style,
      niche: s.niche,
      projectTitle: s.title,
      status: s.status,
    }))
  )
  const seed = (projectTitle?.length ?? 0) % 3
  const presenceLine = useMemo(
    () => getWorkflowPresenceLine(status, seed),
    [status, seed]
  )
  const threadLine = useMemo(() => getProductionThreadLine(seed), [seed])

  return (
    <div
      className={cn(
        'hidden sm:flex flex-col items-center gap-1.5 mt-4 sm:mt-5 cinematic-presence-glow rounded-xl px-3 py-2',
        className
      )}
      role="status"
    >
      <p className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.24em] uppercase text-[#C8A24E]/55 cinematic-world-breathing">
        <DirectingPresencePulse />
        {presenceLine}
      </p>
      <p className="text-[8px] tracking-[0.2em] uppercase text-white/28 emotional-sequence-opacity">
        {threadLine}
      </p>
      <AuthoredMemoryAtmosphere style={style} niche={niche} seed={seed + 1} />
      <EmotionalWorldPresence style={style} niche={niche} seed={seed + 2} />
      <CinematicPreservationRhythm style={style} niche={niche} seed={seed + 3} />
      <EmotionalPresentationPresence style={style} niche={niche} seed={seed + 4} />
      <CinematicPremiereRhythm style={style} niche={niche} seed={seed + 5} />
      <ShowcaseEmotionalPresentationPresence style={style} niche={niche} seed={seed + 6} />
      <CinematicPremiereContinuity style={style} niche={niche} seed={seed + 7} />
      <CinematicOperatingPresence style={style} niche={niche} seed={seed + 8} className="hidden 2xl:block" />
      <FinalOperatingPresence style={style} niche={niche} seed={seed + 9} className="hidden 2xl:block" />
    </div>
  )
}
