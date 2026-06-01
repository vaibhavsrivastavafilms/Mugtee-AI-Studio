'use client'

import { useMemo } from 'react'
import {
  getSharingAnchorLine,
  getEmotionalSharingPresenceLine,
  getCinematicPresentationEnvironmentLine,
  getCinematicHandoffPresenceLine,
  getEmotionalViewerTransitionLine,
  getVisualStoryTransferLine,
  getCinematicShowcaseFlowLine,
  getCinematicShowcaseRhythmLine,
  getEmotionalPresentationFlowLine,
  getVisualStoryViewingThreadLine,
  getCinematicAudiencePresenceLine,
  getCinematicShowcaseMemoryLine,
  getEmotionalViewingRecallLine,
  getVisualStoryPreservationLine,
  getCinematicAtmosphereContinuityLine,
  getEmotionalPresentationFocusLine,
  getCinematicStoryPresenceLine,
  getCinematicSharingAtmosphereLine,
  getEmotionalPresentationPresenceLine,
  getCinematicPremiereContinuityLine,
  getCinematicShowcaseRouteLine,
} from '@/lib/creator/cinematic-showcase-copy'
import { DeliveryPresenceLine } from '@/components/cinematic/cinematic-delivery/delivery-presence-line'
import { cn } from '@/lib/utils'

type ShowcaseProps = {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}

type SceneShowcaseProps = ShowcaseProps & {
  sceneIndex: number
  totalScenes?: number
}

function useShowcaseLine(
  resolver: (...args: never[]) => string,
  deps: readonly unknown[]
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps tuple is the call-site dependency list
  return useMemo(() => resolver(...(deps as never[])), deps)
}

export function EmotionalSharingPresence({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getEmotionalSharingPresenceLine, [style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/44 emotional-presentation-glow sm:hidden', className)}
    />
  )
}

export function SharingAnchorPresence({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: SceneShowcaseProps) {
  const line = useShowcaseLine(getSharingAnchorLine, [sceneIndex, style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/40 emotional-presentation-glow hidden sm:block', className)}
    />
  )
}

export function CinematicPresentationEnvironment({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicPresentationEnvironmentLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicHandoffPresence({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicHandoffPresenceLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalViewerTransition({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getEmotionalViewerTransitionLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function VisualStoryTransfer({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getVisualStoryTransferLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicShowcaseFlow({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneShowcaseProps) {
  const line = useShowcaseLine(getCinematicShowcaseFlowLine, [sceneIndex, totalScenes, seed])
  return <DeliveryPresenceLine line={line} className={cn('emotional-showcase-breathing hidden sm:block', className)} />
}

export function CinematicShowcaseRhythm({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicShowcaseRhythmLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalPresentationFlow({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getEmotionalPresentationFlowLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function VisualStoryViewingThread({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneShowcaseProps) {
  const line = useShowcaseLine(getVisualStoryViewingThreadLine, [sceneIndex, totalScenes, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicAudiencePresence({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicAudiencePresenceLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicShowcaseMemory({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicShowcaseMemoryLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function EmotionalViewingRecall({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getEmotionalViewingRecallLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function VisualStoryPreservation({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getVisualStoryPreservationLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicAtmosphereContinuity({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicAtmosphereContinuityLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function EmotionalPresentationFocus({
  sceneIndex,
  seed = 0,
  className,
}: Pick<SceneShowcaseProps, 'sceneIndex' | 'seed' | 'className'>) {
  const line = useShowcaseLine(getEmotionalPresentationFocusLine, [sceneIndex, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicStoryPresence({
  sceneIndex,
  style,
  seed = 0,
  className,
}: SceneShowcaseProps) {
  const line = useShowcaseLine(getCinematicStoryPresenceLine, [sceneIndex, style, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicSharingAtmosphere({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicSharingAtmosphereLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function ShowcaseEmotionalPresentationPresence({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getEmotionalPresentationPresenceLine, [style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/36 emotional-presentation-glow hidden lg:block', className)}
    />
  )
}

export function CinematicPremiereContinuity({ style, niche, seed = 0, className }: ShowcaseProps) {
  const line = useShowcaseLine(getCinematicPremiereContinuityLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicShowcaseRoutePresence({
  stage,
  style,
  niche,
  seed = 0,
  className,
}: ShowcaseProps & { stage: string }) {
  const line = useShowcaseLine(getCinematicShowcaseRouteLine, [stage, style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/42 emotional-presentation-glow text-center', className)}
    />
  )
}
