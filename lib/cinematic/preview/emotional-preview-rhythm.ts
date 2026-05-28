import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'

export type EmotionalPreviewRhythm = {
  label: string
  buildupMs: number
  transitionHint: string
  beatWeights: Array<'open' | 'build' | 'peak' | 'release' | 'hold'>
}

function weightForRole(role: string): EmotionalPreviewRhythm['beatWeights'][number] {
  if (role === 'hook') return 'open'
  if (role === 'tension') return 'build'
  if (role === 'peak') return 'peak'
  if (role === 'aftertaste') return 'hold'
  return 'release'
}

export function buildEmotionalPreviewRhythm(
  scenes: GeneratedScene[],
  totalDuration: number
): EmotionalPreviewRhythm {
  const total = Math.max(scenes.length, 1)
  const beatWeights: EmotionalPreviewRhythm['beatWeights'] = scenes.length
    ? scenes.map((_, i) => weightForRole(scenePacingRole(i + 1, total)))
    : ['open', 'build', 'peak', 'hold']

  const hasPeak = beatWeights.includes('peak')
  const label = hasPeak
    ? 'Rising cadence toward emotional peak'
    : 'Held rhythm — lyrical restraint'

  return {
    label,
    buildupMs: Math.max(1800, Math.round((totalDuration * 1000) / total * 0.9)),
    transitionHint: hasPeak ? 'dissolve into peak · cut on release' : 'held cuts · breathing room',
    beatWeights,
  }
}

/** Merge preview rhythm with render blueprint rhythm when both exist. */
export function mergePreviewRhythm(
  emotional: EmotionalPreviewRhythm,
  blueprintRhythm?: PreviewRhythmMetadata
): PreviewRhythmMetadata {
  if (blueprintRhythm) return blueprintRhythm
  return {
    beatIntervalsMs: emotional.beatWeights.map((w, i) => {
      const base = emotional.buildupMs
      if (w === 'open' || i === 0) return Math.round(base * 0.88)
      if (w === 'peak') return Math.round(base * 1.08)
      if (w === 'hold') return Math.round(base * 1.12)
      return base
    }),
    fadeMs: 380,
    narrationPacingLabel: emotional.label,
    transitionRhythm: emotional.transitionHint,
    movementSequencing: [],
  }
}
