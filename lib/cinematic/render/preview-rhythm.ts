import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import type { EmotionalSequenceBeat } from '@/lib/cinematic/execution/compile/emotional-film-plan'
import {
  averageTransitionFadeMs,
  emotionalTransitionMotion,
} from '@/lib/cinematic/motion/emotional-transition-motion'

export type PreviewRhythmMetadata = {
  beatIntervalsMs: number[]
  fadeMs: number
  narrationPacingLabel: string
  transitionRhythm: string
  movementSequencing: string[]
  emotionalWeights: string[]
  transitionFadeMs: number[]
}

function intervalForBeat(
  durationSec: number,
  weight: EmotionalSequenceBeat['emotionalWeight'] | undefined,
  index: number,
  total: number
): number {
  const base = durationSec * 1000
  if (weight === 'open' || index === 0) return Math.max(2000, Math.round(base * 0.9))
  if (weight === 'peak') return Math.max(2300, Math.round(base * 1.1))
  if (weight === 'hold' || index === total - 1) return Math.max(2500, Math.round(base * 1.16))
  if (weight === 'build') return Math.max(2100, Math.round(base * 1.04))
  return Math.max(2000, Math.round(base * 1.02))
}

export function buildPreviewRhythmFromBlueprint(
  blueprint: CinematicRenderBlueprint,
  options?: { restrainedMotion?: boolean }
): PreviewRhythmMetadata {
  const total = blueprint.shots.length
  const beatIntervalsMs = blueprint.shots.map((shot, i) => {
    const beat = blueprint.sequence[i]
    return intervalForBeat(shot.durationSec, beat?.emotionalWeight, i, total)
  })

  const hasDissolve = blueprint.shots.some((s) => s.transition === 'dissolve')
  const motionFade = averageTransitionFadeMs(total)
  const fadeMs = options?.restrainedMotion
    ? Math.min(hasDissolve ? 260 : 200, motionFade)
    : Math.min(hasDissolve ? 560 : 480, motionFade + 60)

  const transitionFadeMs = blueprint.shots.map((_, i) => {
    if (total <= 1) return fadeMs
    const next = Math.min(i + 2, total)
    return emotionalTransitionMotion(i + 1, next, total).fadeMs
  })

  const emotionalWeights = blueprint.sequence.map((b) => b.emotionalWeight)

  return {
    beatIntervalsMs,
    fadeMs,
    narrationPacingLabel: blueprint.narrationRhythm,
    transitionRhythm: blueprint.transitionRhythm,
    movementSequencing: blueprint.motionDirections,
    emotionalWeights,
    transitionFadeMs,
  }
}

export function beatIntervalMsFromRhythm(
  rhythm: PreviewRhythmMetadata,
  index: number,
  frameCount: number,
  durationSec: number
): number {
  if (rhythm.beatIntervalsMs[index] != null) return rhythm.beatIntervalsMs[index]
  if (frameCount <= 1) return Math.max(2400, durationSec * 1000)
  const base = (durationSec * 1000) / frameCount
  return Math.max(1900, Math.round(base))
}
