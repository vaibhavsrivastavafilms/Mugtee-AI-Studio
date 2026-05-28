import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const PRODUCTION_PRESENCE = [
  'Your cinematic world is in motion',
  'Directing environment breathing',
  'Story held in cinematic session',
] as const

const ACTIVE_SEQUENCE = [
  'Active emotional sequence in progress',
  'Visual rhythm continuity preserved across scenes',
  'Documentary tension sequence remains active',
] as const

const ENVIRONMENT_RETURN = [
  'Your cinematic atmosphere remains intact.',
  'Returning to your active emotional sequence.',
  'Directing world continuity preserved.',
] as const

const PRODUCTION_THREAD = [
  'Emotional pacing continues naturally.',
  'Visual directing rhythm remains aligned.',
  'Cinematic momentum preserved across beats.',
] as const

const PRODUCTION_STATE = [
  'Visual story continuity held.',
  'Cinematic directing rhythm steady.',
  'Emotional arc rests in balance.',
] as const

const EXPORT_LEGACY = [
  'Your cinematic sequence now joins your directing archive.',
  'Emotional continuity preserved through the final showcase.',
  'Visual story world finalized.',
] as const

export function getProductionPresenceLine(seed = 0): string {
  return PRODUCTION_PRESENCE[seed % PRODUCTION_PRESENCE.length]
}

export function getActiveSequenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const tailored = [
    `${id.label} sequence remains active.`,
    `Visual rhythm continuity preserved across scenes.`,
    ACTIVE_SEQUENCE[seed % ACTIVE_SEQUENCE.length],
  ]
  return tailored[seed % tailored.length]
}

export function getEnvironmentReturnLine(seed = 0): string {
  return ENVIRONMENT_RETURN[seed % ENVIRONMENT_RETURN.length]
}

export function getAtmosphereMemoryLine(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · atmosphere remembered`
}

export function getProductionThreadLine(seed = 0): string {
  return PRODUCTION_THREAD[seed % PRODUCTION_THREAD.length]
}

export function getEmotionalSequenceFlow(
  stage: CinematicProjectStatus | string,
  seed = 0
): string {
  const stageLines: Record<string, string[]> = {
    preview: ['Screenplay sequence flowing', 'Draft world active'],
    director: ['Directing sequence evolving', 'Mood world active'],
    scenes: ['Visual sequence progressing', 'Storyboard world active'],
    compile: ['Showcase sequence nearing closure', 'Film world taking final form'],
  }
  const pool = stageLines[stage] ?? ['Your sequence continues']
  return pool[seed % pool.length]
}

export function getVisualProductionContinuity(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.rhythm} · production continuity`
}

export function getDirectingMomentumTrack(
  sceneCount: number,
  seed = 0
): string {
  if (sceneCount <= 0) return 'Directing momentum gathering'
  const pool = [
    `Directing momentum · ${sceneCount} beats staged`,
    'Visual production rhythm aligned',
    'Emotional sequence momentum held',
  ]
  return pool[seed % pool.length]
}

export function getEmotionalProductionState(seed = 0): string {
  return PRODUCTION_STATE[seed % PRODUCTION_STATE.length]
}

export function getCinematicProcessPresence(stage: string, seed = 0): string {
  const pool = [
    getEmotionalProductionState(seed),
    getProductionThreadLine(seed),
    getEmotionalSequenceFlow(stage, seed),
  ]
  return pool[seed % pool.length]
}

export function getDirectingRhythmState(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.pacing} · rhythm stable`
}

export function getVisualStoryPresence(seed = 0): string {
  const pool = [
    'Visual story continuity active.',
    'Cinematic story world present.',
    'Directed narrative atmosphere held.',
  ]
  return pool[seed % pool.length]
}

export function getExportLegacyLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_LEGACY[seed % EXPORT_LEGACY.length],
    `${id.label} sequence archived in your film world.`,
    'Visual story world finalized.',
  ]
  return pool[seed % pool.length]
}

export function getEmotionalProductionThread(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · emotional production thread`
}

export function getProjectWorldHeadline(
  title?: string | null,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (title?.trim()) return title.trim()
  return `${id.label} film world`
}

export function getProjectAtmosphereSubtitle(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.pacing} · ${id.tone}`
}
