import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const STAGE_LINES: Partial<Record<CinematicProjectStatus | string, string[]>> = {
  create: [
    'Narrative pacing locked',
    'Your cinematic premise is taking shape',
  ],
  generating: [
    'Hook intensity elevated',
    'Emotional cadence forming',
  ],
  preview: [
    'Narrative pacing locked',
    'Rhythm held before the lens',
  ],
  director: [
    'Visual continuity aligned',
    'Directing cadence in balance',
  ],
  scenes: [
    'Visual continuity aligned',
    'Visual rhythm preserved',
  ],
  voiceover: [
    'Voice arc aligned to story',
    'Narration breath matches your beats',
  ],
  compile: [
    'Final rhythm gathering',
    'Showcase sequence nearly complete',
  ],
  complete: ['Your cinematic draft is ready to continue'],
}

export function getMomentumLine(
  stage: CinematicProjectStatus | string,
  seed = 0
): string {
  const lines = STAGE_LINES[stage] ?? STAGE_LINES.create!
  return lines[seed % lines.length]
}

const REASSURANCE_LINES = [
  'Pacing continuity preserved',
  'Your arc remains intact',
  'Directed rhythm carries forward',
] as const

export function getMomentumReassurance(seed = 0): string {
  return REASSURANCE_LINES[seed % REASSURANCE_LINES.length]
}

export function getDirectedContinuityLine(
  stage: CinematicProjectStatus | string,
  style?: string | null,
  seed = 0
): string {
  const styleWord = style?.trim() || 'cinematic'
  const pool = [
    `Continue shaping your ${styleWord} sequence`,
    `Resume your ${styleWord} directing arc`,
    'Your cinematic draft awaits your direction',
  ]
  if (stage === 'scenes') {
    pool.unshift('Resume visual direction across your scenes')
  }
  if (stage === 'compile') {
    pool.unshift('Your film world awaits its final form')
  }
  return pool[seed % pool.length]
}

export function getMomentumBannerLines(
  stage: CinematicProjectStatus | string,
  seed = 0,
  style?: string | null
): { headline: string; reassurance: string } {
  return {
    headline: getMomentumLine(stage, seed),
    reassurance: style
      ? getDirectedContinuityLine(stage, style, seed)
      : getMomentumReassurance(seed),
  }
}
