'use client'

import {
  LiveCinematicPresenceLine,
  useLiveCinematicLine,
} from '@/components/cinematic/live-cinematic/live-cinematic-presence-line'
import {
  getMotionMobileLine,
  getEmotionalMotionPresenceLine,
  getCinematicSceneMotionLine,
  getCinematicMotionRhythmLine,
  getEmotionalSceneFlowLine,
  getCinematicTransitionPresenceLine,
  getVisualMotionContinuityLine,
  getEmotionalRenderPresenceLine,
  getCinematicShotGenerationLine,
  getEmotionalFilmFlowLine,
  getCinematicVisualRhythmLine,
  getEmotionalVoicePresenceLine,
  getCinematicSoundAtmosphereLine,
  getEmotionalNarrationFlowLine,
  getCinematicAudioPacingLine,
  getFilmExperienceLine,
  getPlaybackPresenceLine,
  getDistributionLine,
  getAudienceImmersionLine,
  getEcosystemLine,
  getWorldEvolutionLine,
  getFinalOperatingLine,
  getFinalInfrastructureLine,
  getLiveCinematicRouteLine,
} from '@/lib/creator/live-cinematic-copy'
import { cn } from '@/lib/utils'

type LiveProps = {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}

type SceneLiveProps = LiveProps & { sceneIndex: number; totalScenes?: number }

// ── 5.1 Motion ──────────────────────────────────────────────────────────────
export function MotionMobileAnchor({ sceneIndex, style, niche, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getMotionMobileLine, [sceneIndex, style, niche, seed])
  return (
    <LiveCinematicPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/40 live-motion-glow sm:hidden', className)}
    />
  )
}

export function EmotionalMotionPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalMotionPresenceLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicSceneMotion({ sceneIndex, style, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getCinematicSceneMotionLine, [sceneIndex, style, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function CinematicMotionRhythm({ sceneIndex, totalScenes = 1, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getCinematicMotionRhythmLine, [sceneIndex, totalScenes, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('live-motion-breathing hidden sm:block', className)} />
}

export function EmotionalSceneFlow({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalSceneFlowLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden sm:block', className)} />
}

export function CinematicTransitionPresence({ seed = 0, className }: Pick<LiveProps, 'seed' | 'className'>) {
  const line = useLiveCinematicLine(getCinematicTransitionPresenceLine, [seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden md:block', className)} />
}

export function VisualMotionContinuity({ sceneIndex, totalScenes = 1, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getVisualMotionContinuityLine, [sceneIndex, totalScenes, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden sm:block sm:ml-auto', className)} />
}

// ── 6 Video ─────────────────────────────────────────────────────────────────
export function EmotionalRenderPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalRenderPresenceLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicShotGeneration({ sceneIndex, style, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getCinematicShotGenerationLine, [sceneIndex, style, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function EmotionalFilmFlow({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalFilmFlowLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicVisualRhythm({ sceneIndex, totalScenes = 1, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getCinematicVisualRhythmLine, [sceneIndex, totalScenes, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

// ── 6.5 Audio ───────────────────────────────────────────────────────────────
export function EmotionalVoicePresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalVoicePresenceLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden lg:block', className)} />
}

export function CinematicSoundAtmosphere({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getCinematicSoundAtmosphereLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function EmotionalNarrationFlow({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEmotionalNarrationFlowLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function CinematicAudioPacing({ sceneIndex, totalScenes = 1, seed = 0, className }: SceneLiveProps) {
  const line = useLiveCinematicLine(getCinematicAudioPacingLine, [sceneIndex, totalScenes, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── 7 Film experience ───────────────────────────────────────────────────────
export function FilmExperiencePresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getFilmExperienceLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function PlaybackPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getPlaybackPresenceLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── 8 Distribution ──────────────────────────────────────────────────────────
export function DistributionPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getDistributionLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function AudienceImmersionPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getAudienceImmersionLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── 9 Ecosystem ─────────────────────────────────────────────────────────────
export function EcosystemPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getEcosystemLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function WorldEvolutionPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getWorldEvolutionLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

// ── 10 Final OS ─────────────────────────────────────────────────────────────
export function FinalOperatingPresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getFinalOperatingLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden xl:block', className)} />
}

export function FinalInfrastructurePresence({ style, niche, seed = 0, className }: LiveProps) {
  const line = useLiveCinematicLine(getFinalInfrastructureLine, [style, niche, seed])
  return <LiveCinematicPresenceLine line={line} className={cn('hidden 2xl:block', className)} />
}

export function LiveCinematicRoutePresence({
  stage,
  style,
  niche,
  seed = 0,
  className,
}: LiveProps & { stage: string }) {
  const line = useLiveCinematicLine(getLiveCinematicRouteLine, [stage, style, niche, seed])
  return (
    <LiveCinematicPresenceLine
      line={line}
      className={cn('text-[#C8A24E]/38 live-motion-glow text-center', className)}
    />
  )
}

export { EmotionalMotionPresence as EmotionalMotionPresenceAlias }
export { CinematicSceneMotion as CinematicSceneMotionAlias }
