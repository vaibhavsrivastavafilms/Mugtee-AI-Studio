import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import { buildPreviewRhythmFromBlueprint } from '@/lib/cinematic/render/preview-rhythm'

/** Client-safe rhythm metadata — no provider or engine fields. */
export type InvisibleFilmMetadata = {
  sceneTimingMs: number[]
  emotionalWeights: string[]
  transitionRhythm: string
  narrationPacing: string
  voiceTiming: string
  soundtrackPlaceholder: string
  movementSequencing: string[]
  motionContinuityThread: string
  filmRhythm: string
  beatIntervalsMs: number[]
  previewFadeMs: number
  anticipationPhase: 'opening' | 'rising' | 'peak' | 'settling'
  reducedMotionHint: boolean
  crossfadeProfile: 'soft' | 'standard' | 'held'
}

export function buildInvisibleFilmMetadata(
  blueprint: CinematicRenderBlueprint
): InvisibleFilmMetadata {
  const rhythm = buildPreviewRhythmFromBlueprint(blueprint)

  const motionThread =
    blueprint.transitionRhythm.split(' · ').pop()?.trim() ||
    rhythm.movementSequencing[0] ||
    'visual thread held in restraint'

  const weights = blueprint.sequence.map((b) => b.emotionalWeight)
  const anticipationPhase: InvisibleFilmMetadata['anticipationPhase'] = weights.includes('peak')
    ? weights[weights.length - 1] === 'hold'
      ? 'settling'
      : 'peak'
    : weights[0] === 'open'
      ? 'opening'
      : 'rising'

  const fadeMs = rhythm.fadeMs
  const crossfadeProfile: InvisibleFilmMetadata['crossfadeProfile'] =
    fadeMs >= 500 ? 'soft' : fadeMs <= 260 ? 'held' : 'standard'

  return {
    sceneTimingMs: blueprint.shots.map((s) => s.durationSec * 1000),
    emotionalWeights: weights,
    transitionRhythm: rhythm.transitionRhythm,
    narrationPacing: rhythm.narrationPacingLabel,
    voiceTiming: blueprint.voiceTiming,
    soundtrackPlaceholder: blueprint.soundtrackBed,
    movementSequencing: rhythm.movementSequencing,
    motionContinuityThread: motionThread,
    filmRhythm: blueprint.filmRhythm,
    beatIntervalsMs: rhythm.beatIntervalsMs,
    previewFadeMs: fadeMs,
    anticipationPhase,
    reducedMotionHint: fadeMs <= 280,
    crossfadeProfile,
  }
}
