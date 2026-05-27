'use client'

import type { ReactNode } from 'react'
import {
  StoryEvolutionPresenceLine,
  useEvolutionLine,
} from '@/components/cinematic/story-evolution/story-evolution-presence-line'
import {
  getStoryExperienceMobileLine,
  getEmotionalViewingImmersionLine,
  getEmotionalSequenceAbsorptionLine,
  getVisualAtmosphereFlowLine,
  getCinematicStoryRhythmLine,
  getCinematicNarrativePresenceLine,
  getEmotionalStoryViewingLine,
  getCinematicAtmosphereImmersionLine,
  getVisualEmotionalSequenceLine,
  getCinematicStoryMemoryLine,
  getEmotionalAtmosphereRecallLine,
  getVisualStoryPreservationLine,
  getCinematicNarrativeContinuityLine,
  getStoryContinuityLine,
  getEmotionalStoryThreadLine,
  getCinematicWorldContinuityLine,
  getCinematicUniverseThreadLine,
  getEmotionalStoryPresenceLine,
  getCinematicStoryEvolutionLine,
  getEmotionalAuthorshipContinuityLine,
  getStorytellingIdentityLine,
  getEmotionalStorySignatureLine,
  getCinematicAuthorshipVoiceLine,
  getCinematicStoryVoiceLine,
  getEmotionalNarrativeRhythmLine,
  getStoryIdentityMemoryLine,
  getUniversePresenceLine,
  getEmotionalWorldNetworkLine,
  getCinematicUniverseGrowthLine,
  getEmotionalWorldContinuityLine,
  getOperatingPresenceLine,
  getStorytellingInfrastructureLine,
  getEmotionalUniverseContinuityLine,
  getCinematicStorytellingEvolutionLine,
  getStoryEvolutionRouteLine,
} from '@/lib/creator/cinematic-story-evolution-copy'
import { cn } from '@/lib/utils'

type EvoProps = {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}

type SceneEvoProps = EvoProps & { sceneIndex: number; totalScenes?: number }

// ── Phase 4.2 ───────────────────────────────────────────────────────────────
export function EmotionalViewingImmersion({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalViewingImmersionLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function StoryExperienceMobileAnchor({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getStoryExperienceMobileLine, [sceneIndex, style, niche, seed])
  return (
    <StoryEvolutionPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/42 story-experience-glow sm:hidden', className)}
    />
  )
}

export function CinematicStoryPresenceStrip({
  sceneIndex,
  style,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getEmotionalStoryViewingLine, [sceneIndex, style, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicEmotionalImmersion({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicAtmosphereImmersionLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalSequenceAbsorption({ seed = 0, className }: Pick<EvoProps, 'seed' | 'className'>) {
  const line = useEvolutionLine(getEmotionalSequenceAbsorptionLine, [seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function VisualAtmosphereFlow({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getVisualAtmosphereFlowLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicStoryRhythm({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getCinematicStoryRhythmLine, [sceneIndex, totalScenes, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('story-experience-breathing hidden sm:block', className)} />
}

export function CinematicNarrativePresence({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicNarrativePresenceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalStoryViewing({
  sceneIndex,
  style,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getEmotionalStoryViewingLine, [sceneIndex, style, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicAtmosphereImmersion({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicAtmosphereImmersionLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function VisualEmotionalSequence({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getVisualEmotionalSequenceLine, [sceneIndex, totalScenes, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicStoryMemory({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicStoryMemoryLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function EmotionalAtmosphereRecall({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalAtmosphereRecallLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function VisualStoryPreservation({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getVisualStoryPreservationLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicNarrativeContinuity({
  sceneIndex,
  totalScenes = 1,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getCinematicNarrativeContinuityLine, [sceneIndex, totalScenes, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden sm:block sm:ml-auto', className)} />
}

// ── Phase 4.3 ───────────────────────────────────────────────────────────────
export function EmotionalStoryThread({
  sceneIndex,
  style,
  seed = 0,
  className,
}: SceneEvoProps) {
  const line = useEvolutionLine(getEmotionalStoryThreadLine, [sceneIndex, style, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicWorldContinuity({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicWorldContinuityLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicUniverseThread({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicUniverseThreadLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function EmotionalStoryPresence({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalStoryPresenceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicStoryEvolution({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicStoryEvolutionLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function EmotionalAuthorshipContinuity({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalAuthorshipContinuityLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

// ── Phase 4.4 ───────────────────────────────────────────────────────────────
export function CinematicStorytellingIdentity({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getStorytellingIdentityLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function EmotionalStorySignature({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalStorySignatureLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicAuthorshipVoice({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicAuthorshipVoiceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicStoryVoice({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicStoryVoiceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function EmotionalNarrativeRhythm({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalNarrativeRhythmLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicStoryIdentityMemory({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getStoryIdentityMemoryLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── Phase 4.5 ───────────────────────────────────────────────────────────────
export function CinematicUniversePresence({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getUniversePresenceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function EmotionalWorldNetwork({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalWorldNetworkLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicUniverseGrowth({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicUniverseGrowthLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function EmotionalWorldContinuity({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalWorldContinuityLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── Phase 5 ─────────────────────────────────────────────────────────────────
export function CinematicOperatingPresence({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getOperatingPresenceLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicStorytellingInfrastructure({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getStorytellingInfrastructureLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function EmotionalUniverseContinuity({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getEmotionalUniverseContinuityLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicStorytellingEvolution({ style, niche, seed = 0, className }: EvoProps) {
  const line = useEvolutionLine(getCinematicStorytellingEvolutionLine, [style, niche, seed])
  return <StoryEvolutionPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function StoryEvolutionRoutePresence({
  stage,
  style,
  niche,
  seed = 0,
  className,
}: EvoProps & { stage: string }) {
  const line = useEvolutionLine(getStoryEvolutionRouteLine, [stage, style, niche, seed])
  return (
    <StoryEvolutionPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/40 story-experience-glow text-center', className)}
    />
  )
}

// Aliases for spec file names
export { StoryExperienceMobileAnchor as EmotionalSharingPresenceAlias }
export { CinematicStoryPresenceStrip as CinematicStoryPresence }
export { EmotionalViewingImmersion as EmotionalViewingImmersionPresence }
