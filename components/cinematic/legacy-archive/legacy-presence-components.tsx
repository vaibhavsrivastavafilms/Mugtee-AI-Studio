'use client'

import { useMemo } from 'react'
import {
  getEmotionalArchivePresenceLine,
  getCinematicPermanenceLine,
  getCreatorLegacyPresenceLine,
  getCinematicArchivePresenceLine,
  getEmotionalWorldRecallLine,
  getVisualStorylineMemoryLine,
  getCinematicLegacyRhythmLine,
  getCinematicAuthorshipContinuityLine,
  getEmotionalSignatureContinuationLine,
  getVisualIdentityThreadLine,
  getCinematicWorldMemoryLine,
  getCinematicReturnPresenceLine,
  getEmotionalWorldReentryLine,
  getAuthoredAtmosphereRecallLine,
  getCinematicSessionContinuityLine,
  getEmotionalStoryPresenceLine,
  getVisualAuthorshipEchoLine,
  getCinematicMemoryDepthLine,
  getEmotionalWorldPresenceLine,
  getAuthoredMemoryAtmosphereLine,
  getCinematicPreservationRhythmLine,
  getLegacyArchiveAnchorLine,
  getEmotionalProjectContinuityLine,
  getAuthoredArchiveAtmosphereLine,
  getStorytellingOwnershipLine,
  getArchiveMemoryEchoLine,
  getLegacyContinuityLine,
} from '@/lib/creator/legacy-archive-copy'
import { LegacyPresenceLine } from '@/components/cinematic/legacy-archive/legacy-presence-line'
import { cn } from '@/lib/utils'

type LegacyProps = {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}

type SceneLegacyProps = LegacyProps & {
  sceneIndex: number
  totalScenes?: number
}

type ReturnProps = LegacyProps & {
  status?: string
}

function useLegacyLine(
  resolver: (...args: never[]) => string,
  deps: readonly unknown[]
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps tuple is the call-site dependency list
  return useMemo(() => resolver(...(deps as never[])), deps)
}

export function EmotionalArchivePresence({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getEmotionalArchivePresenceLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/48 cinematic-permanence-glow sm:hidden', className)}
    />
  )
}

export function LegacyArchiveMobileAnchor({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: SceneLegacyProps) {
  const line = useLegacyLine(getLegacyArchiveAnchorLine, [sceneIndex, style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/44 cinematic-permanence-glow hidden sm:block', className)}
    />
  )
}

export function CinematicWorldPermanence({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicPermanenceLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-white/28 creator-legacy-opacity hidden sm:block', className)}
    />
  )
}

export function CreatorLegacyPresenceStrip({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCreatorLegacyPresenceLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-white/26 authored-world-presence hidden sm:block', className)}
    />
  )
}

export function CinematicArchivePresence({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicArchivePresenceLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/36 hidden sm:block', className)}
    />
  )
}

export function EmotionalWorldRecall({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getEmotionalWorldRecallLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('archive-continuity-breathing hidden sm:block', className)}
    />
  )
}

export function VisualStorylineMemory({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getVisualStorylineMemoryLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('visual-memory-opacity hidden sm:block', className)}
    />
  )
}

export function CinematicLegacyRhythm({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicLegacyRhythmLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/34 hidden sm:block', className)}
    />
  )
}

export function CinematicAuthorshipContinuity({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneLegacyProps) {
  const line = useLegacyLine(getCinematicAuthorshipContinuityLine, [sceneIndex, totalScenes, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('authored-continuity-breathing hidden sm:block', className)}
    />
  )
}

export function EmotionalSignatureContinuation({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getEmotionalSignatureContinuationLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('emotional-preservation-glow hidden sm:block', className)}
    />
  )
}

export function VisualIdentityThread({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getVisualIdentityThreadLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('hidden sm:block', className)}
    />
  )
}

export function CinematicWorldMemory({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicWorldMemoryLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('archive-continuity-breathing hidden sm:block', className)}
    />
  )
}

export function CinematicReturnPresence({
  status = 'preview',
  style,
  niche,
  seed = 0,
  className,
}: ReturnProps) {
  const line = useLegacyLine(getCinematicReturnPresenceLine, [status, style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/46 cinematic-permanence-glow text-center', className)}
    />
  )
}

export function EmotionalWorldReentry({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getEmotionalWorldReentryLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-center hidden sm:block', className)}
    />
  )
}

export function AuthoredAtmosphereRecall({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getAuthoredAtmosphereRecallLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-center hidden sm:block', className)}
    />
  )
}

export function CinematicSessionContinuity({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicSessionContinuityLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-center hidden sm:block', className)}
    />
  )
}

export function EmotionalStoryPresence({
  sceneIndex,
  style,
  seed = 0,
  className,
}: SceneLegacyProps) {
  const line = useLegacyLine(getEmotionalStoryPresenceLine, [sceneIndex, style, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/32 hidden md:block', className)}
    />
  )
}

export function VisualAuthorshipEcho({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getVisualAuthorshipEchoLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('hidden md:block', className)}
    />
  )
}

export function CinematicMemoryDepthStrip({
  sceneIndex,
  seed = 0,
  className,
}: Pick<SceneLegacyProps, 'sceneIndex' | 'seed' | 'className'>) {
  const line = useLegacyLine(getCinematicMemoryDepthLine, [sceneIndex, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('hidden md:block', className)}
    />
  )
}

export function EmotionalWorldPresence({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getEmotionalWorldPresenceLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/40 emotional-presence-breathing hidden lg:block', className)}
    />
  )
}

export function AuthoredMemoryAtmosphere({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getAuthoredMemoryAtmosphereLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('legacy-atmosphere-opacity hidden lg:block', className)}
    />
  )
}

export function CinematicPreservationRhythm({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getCinematicPreservationRhythmLine, [style, niche, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('hidden lg:block', className)}
    />
  )
}

export function EmotionalProjectContinuityStrip({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneLegacyProps) {
  const line = useLegacyLine(getEmotionalProjectContinuityLine, [sceneIndex, totalScenes, seed])
  return <LegacyPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function AuthoredArchiveAtmosphereStrip({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getAuthoredArchiveAtmosphereLine, [style, niche, seed])
  return <LegacyPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function StorytellingOwnershipStrip({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getStorytellingOwnershipLine, [style, niche, seed])
  return <LegacyPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function ArchiveMemoryEchoStrip({ style, niche, seed = 0, className }: LegacyProps) {
  const line = useLegacyLine(getArchiveMemoryEchoLine, [style, niche, seed])
  return <LegacyPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function LegacyContinuityStrip({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneLegacyProps) {
  const line = useLegacyLine(getLegacyContinuityLine, [sceneIndex, totalScenes, seed])
  return (
    <LegacyPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/32 cinematic-permanence-glow hidden sm:block sm:ml-auto', className)}
    />
  )
}
