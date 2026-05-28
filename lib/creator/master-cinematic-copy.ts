import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'

const REFINEMENT_RHYTHM = [
  'Your cinematic rhythm remains protected.',
  'Visual continuity remains intact.',
  'Only this emotional beat continues evolving.',
] as const

const SELECTIVE_EVOLUTION = [
  'Selective evolution · surrounding beats preserved.',
  'This moment evolves · sequence continuity held.',
  'Focused refinement · emotional arc stable.',
] as const

const EXPORT_CLOSURE = [
  'Your cinematic sequence now enters your directing archive.',
  'Visual continuity preserved through final delivery.',
  'Emotional pacing finalized.',
] as const

const DELIVERY_ATMOSPHERE = [
  'Directed sequence delivered.',
  'Cinematic world closure complete.',
  'Final emotional arc preserved.',
] as const

const WORKFLOW_PRESENCE = [
  'Directing environment active.',
  'Cinematic atmosphere held.',
  'Emotional continuity preserved.',
] as const

export function getRefinementRhythmLine(seed = 0): string {
  return REFINEMENT_RHYTHM[seed % REFINEMENT_RHYTHM.length]
}

export function getSelectiveEvolutionLine(seed = 0): string {
  return SELECTIVE_EVOLUTION[seed % SELECTIVE_EVOLUTION.length]
}

export function getExportClosureLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_CLOSURE[seed % EXPORT_CLOSURE.length],
    `${id.label} sequence enters your directing archive.`,
    'Emotional pacing finalized.',
  ]
  return pool[seed % pool.length]
}

export function getDeliveryAtmosphereLine(seed = 0): string {
  return DELIVERY_ATMOSPHERE[seed % DELIVERY_ATMOSPHERE.length]
}

export function getWorkflowPresenceLine(
  stage: CinematicProjectStatus | string,
  seed = 0
): string {
  const pool = [...WORKFLOW_PRESENCE, `${stage} · directing continuity`]
  return pool[seed % pool.length]
}

export function getIdentityPresenceLine(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.label} · ${id.tone}`
}

export function getRhythmPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    `${id.pacing} · rhythm held`,
    `${id.rhythm} · directing stable`,
    'Cinematic pacing continuity active.',
  ]
  return pool[seed % pool.length]
}

export function getProjectEnvironmentLine(
  title?: string | null,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (title?.trim()) return `Returning to ${title.trim()}`
  return `Living ${id.label} production world`
}

export function getSequenceEnvironmentLine(
  stage: CinematicProjectStatus | string,
  seed = 0
): string {
  const stageLines: Record<string, string[]> = {
    preview: ['Screenplay world active', 'Draft sequence breathing'],
    director: ['Directing world evolving', 'Mood sequence active'],
    scenes: ['Storyboard world progressing', 'Visual beats staged'],
    voiceover: ['Voice world forming', 'Narration sequence active'],
    compile: ['Delivery world forming', 'Final sequence approaching'],
  }
  const pool = stageLines[stage] ?? ['Production sequence active']
  return pool[seed % pool.length]
}
