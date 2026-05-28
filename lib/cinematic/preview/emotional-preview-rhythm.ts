import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'
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
    ? scenes.map((_, i) => weightForRole(sceneArcRole(i + 1, total)))
    : ['open', 'build', 'peak', 'hold']

  const hasPeak = beatWeights.includes('peak')
  const longForm = total >= 10
  const labelPool = hasPeak
    ? longForm
      ? [
          'Rising cadence toward emotional peak — long-form variation held',
          'Tension gathers — crest ahead with breathing beats',
        ]
      : ['Rising cadence toward emotional peak', 'Tension gathers — crest ahead']
    : longForm
      ? ['Held rhythm — lyrical restraint across extended arc', 'Even breath — documentary cadence with variation']
      : ['Held rhythm — lyrical restraint', 'Even breath — documentary cadence']
  const label = labelPool[total % labelPool.length]

  const buildupBase = Math.max(1800, Math.round((totalDuration * 1000) / total * 0.9))
  const buildupMs = longForm
    ? Math.round(buildupBase * (1 + Math.sin(total * 0.3) * 0.04))
    : buildupBase

  return {
    label,
    buildupMs,
    transitionHint: hasPeak
      ? longForm
        ? 'dissolve into peak · cut on release · mid-arc breaths'
        : 'dissolve into peak · cut on release'
      : longForm
        ? 'held cuts · breathing room · anti-fatigue variation'
        : 'held cuts · breathing room',
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
    emotionalWeights: emotional.beatWeights,
    transitionFadeMs: emotional.beatWeights.map((w) =>
      w === 'peak' ? 480 : w === 'hold' ? 520 : 360
    ),
  }
}
