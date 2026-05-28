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
  filmRhythm: string
  beatIntervalsMs: number[]
  previewFadeMs: number
}

export function buildInvisibleFilmMetadata(
  blueprint: CinematicRenderBlueprint
): InvisibleFilmMetadata {
  const rhythm = buildPreviewRhythmFromBlueprint(blueprint)

  return {
    sceneTimingMs: blueprint.shots.map((s) => s.durationSec * 1000),
    emotionalWeights: blueprint.sequence.map((b) => b.emotionalWeight),
    transitionRhythm: rhythm.transitionRhythm,
    narrationPacing: rhythm.narrationPacingLabel,
    voiceTiming: blueprint.voiceTiming,
    soundtrackPlaceholder: blueprint.soundtrackBed,
    movementSequencing: rhythm.movementSequencing,
    filmRhythm: blueprint.filmRhythm,
    beatIntervalsMs: rhythm.beatIntervalsMs,
    previewFadeMs: rhythm.fadeMs,
  }
}
