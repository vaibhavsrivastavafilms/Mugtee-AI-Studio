import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import type { EmotionalSequenceBeat } from '@/lib/cinematic/execution/compile/emotional-film-plan'
import { averageTransitionFadeMs } from '@/lib/cinematic/motion/emotional-transition-motion'

export type PreviewRhythmMetadata = {
  beatIntervalsMs: number[]
  fadeMs: number
  narrationPacingLabel: string
  transitionRhythm: string
  movementSequencing: string[]
}

function intervalForBeat(
  durationSec: number,
  weight: EmotionalSequenceBeat['emotionalWeight'] | undefined,
  index: number,
  total: number
): number {
  const base = durationSec * 1000
  if (weight === 'open' || index === 0) return Math.max(1800, Math.round(base * 0.88))
  if (weight === 'peak') return Math.max(2200, Math.round(base * 1.08))
  if (weight === 'hold' || index === total - 1) return Math.max(2400, Math.round(base * 1.12))
  if (weight === 'build') return Math.max(2000, Math.round(base * 1.02))
  return Math.max(1900, Math.round(base))
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
    ? Math.min(hasDissolve ? 280 : 220, motionFade)
    : Math.min(hasDissolve ? 520 : 420, motionFade + 80)

  return {
    beatIntervalsMs,
    fadeMs,
    narrationPacingLabel: blueprint.narrationRhythm,
    transitionRhythm: blueprint.transitionRhythm,
    movementSequencing: blueprint.motionDirections,
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
