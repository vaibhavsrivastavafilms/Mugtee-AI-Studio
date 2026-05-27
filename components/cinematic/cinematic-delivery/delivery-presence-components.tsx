'use client'

import { useMemo } from 'react'
import {
  getViewingAnchorLine,
  getEmotionalPlaybackPresenceLine,
  getCinematicViewingEnvironmentLine,
  getCinematicShowcasePresenceLine,
  getEmotionalViewingAtmosphereLine,
  getVisualStoryShowcaseLine,
  getCinematicPlaybackFlowLine,
  getEmotionalViewingRhythmLine,
  getVisualSequencePlaybackLine,
  getCinematicAtmosphereViewingLine,
  getCinematicViewingMemoryLine,
  getEmotionalShowcaseRecallLine,
  getVisualStoryPresenceMemoryLine,
  getCinematicAtmosphereRetentionLine,
  getEmotionalPlaybackFocusLine,
  getImmersiveShowcaseDepthLine,
  getCinematicSequenceViewLine,
  getCinematicPremiereLayerLine,
  getEmotionalPresentationPresenceLine,
  getCinematicPremiereRhythmLine,
  getCinematicViewingRouteLine,
} from '@/lib/creator/cinematic-delivery-copy'
import { DeliveryPresenceLine } from '@/components/cinematic/cinematic-delivery/delivery-presence-line'
import { cn } from '@/lib/utils'

type DeliveryProps = {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}

type SceneDeliveryProps = DeliveryProps & {
  sceneIndex: number
  totalScenes?: number
}

function useDeliveryLine(
  resolver: (...args: never[]) => string,
  deps: readonly unknown[]
) {
  return useMemo(() => resolver(...(deps as never[])), deps)
}

export function EmotionalPlaybackPresence({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getEmotionalPlaybackPresenceLine, [style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/46 emotional-showcase-glow sm:hidden', className)}
    />
  )
}

export function ViewingAnchorPresence({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: SceneDeliveryProps) {
  const line = useDeliveryLine(getViewingAnchorLine, [sceneIndex, style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/42 emotional-showcase-glow hidden sm:block', className)}
    />
  )
}

export function CinematicViewingEnvironment({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicViewingEnvironmentLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicShowcasePresence({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicShowcasePresenceLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalViewingAtmosphere({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getEmotionalViewingAtmosphereLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('viewing-atmosphere-opacity hidden sm:block', className)} />
}

export function VisualStoryShowcase({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getVisualStoryShowcaseLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicPlaybackFlow({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneDeliveryProps) {
  const line = useDeliveryLine(getCinematicPlaybackFlowLine, [sceneIndex, totalScenes, seed])
  return <DeliveryPresenceLine line={line} className={cn('emotional-playback-breathing hidden sm:block', className)} />
}

export function EmotionalViewingRhythm({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getEmotionalViewingRhythmLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function VisualSequencePlayback({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getVisualSequencePlaybackLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicAtmosphereViewing({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicAtmosphereViewingLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicViewingMemory({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicViewingMemoryLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function EmotionalShowcaseRecall({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getEmotionalShowcaseRecallLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function VisualStoryPresenceMemory({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getVisualStoryPresenceMemoryLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicAtmosphereRetention({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicAtmosphereRetentionLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function EmotionalPlaybackFocus({
  sceneIndex,
  seed = 0,
  className,
}: Pick<SceneDeliveryProps, 'sceneIndex' | 'seed' | 'className'>) {
  const line = useDeliveryLine(getEmotionalPlaybackFocusLine, [sceneIndex, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function ImmersiveShowcaseDepth({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getImmersiveShowcaseDepthLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicSequenceView({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneDeliveryProps) {
  const line = useDeliveryLine(getCinematicSequenceViewLine, [sceneIndex, totalScenes, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicPremiereLayer({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicPremiereLayerLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function EmotionalPresentationPresence({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getEmotionalPresentationPresenceLine, [style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/38 emotional-showcase-glow hidden lg:block', className)}
    />
  )
}

export function CinematicPremiereRhythm({ style, niche, seed = 0, className }: DeliveryProps) {
  const line = useDeliveryLine(getCinematicPremiereRhythmLine, [style, niche, seed])
  return <DeliveryPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicViewingRoutePresence({
  stage,
  style,
  niche,
  seed = 0,
  className,
}: DeliveryProps & { stage: string }) {
  const line = useDeliveryLine(getCinematicViewingRouteLine, [stage, style, niche, seed])
  return (
    <DeliveryPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/44 emotional-showcase-glow text-center', className)}
    />
  )
}
