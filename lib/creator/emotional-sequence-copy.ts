import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicScene } from '@/stores/cinematic-project'

const ESCALATION_PRESENCE = [
  'Emotional tension builds naturally.',
  'Cinematic escalation continues.',
  'Visual emotional intensity deepening.',
] as const

const PROGRESSION_THREAD = [
  'Atmosphere progression remains aligned.',
  'Emotional arc carries forward.',
  'Cinematic mood continuity held.',
] as const

const VISUAL_RHYTHM = [
  'Emotional visual rhythm steady.',
  'Cinematic beat pacing aligned.',
  'Sequence rhythm emotionally held.',
] as const

const SEQUENCE_FLOW = [
  'Scene-to-scene emotional flow active.',
  'Emotional sequence continuity preserved.',
  'Cinematic progression emotionally connected.',
] as const

const SEQUENCE_BRIDGE = [
  'Previous emotional beat echoes forward.',
  'Atmosphere bridges into the next moment.',
  'Visual emotion carries across beats.',
] as const

const FLOW_CONTINUITY = [
  'Emotional flow continuity active.',
  'Cinematic sequence emotionally grounded.',
  'Atmosphere progression uninterrupted.',
] as const

const EXPORT_SEQUENCE = [
  'Emotional sequence arc complete.',
  'Cinematic progression preserved through delivery.',
  'Atmospheric escalation finalized.',
] as const

export function getEscalationPresenceLine(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const phase =
    sceneIndex <= 1
      ? 'Opening emotional beat'
      : sceneIndex >= totalScenes
        ? 'Closing emotional beat'
        : ESCALATION_PRESENCE[seed % ESCALATION_PRESENCE.length]
  const pool = [phase, `${id.tone} · escalation held`]
  return pool[seed % pool.length]
}

export function getAtmosphereProgressionLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    PROGRESSION_THREAD[seed % PROGRESSION_THREAD.length],
    `Beat ${sceneIndex} · ${totalScenes} emotional arc`,
    'Atmosphere progression continues.',
  ]
  return pool[seed % pool.length]
}

export function getEmotionalVisualRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [VISUAL_RHYTHM[seed % VISUAL_RHYTHM.length], `${id.rhythm} · emotional rhythm`]
  return pool[seed % pool.length]
}

export function getSceneSequenceFlowLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    SEQUENCE_FLOW[seed % SEQUENCE_FLOW.length],
    `Emotional sequence · ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalSequenceBridgeLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex <= 1) return 'Emotional sequence opening'
  if (sceneIndex >= totalScenes) return 'Emotional sequence closure'
  return SEQUENCE_BRIDGE[seed % SEQUENCE_BRIDGE.length]
}

export function getCinematicEscalationThreadLine(
  scene?: Pick<CinematicScene, 'emotion'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.emotion?.trim()) return `${scene.emotion.trim()} · emotional escalation`
  const id = resolveCreatorIdentity(style, null)
  return `${id.pacing} · escalation thread`
}

export function getSequenceAtmosphereProgressionLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · beat ${sceneIndex} progression`
}

export function getEmotionalFlowContinuityLine(seed = 0): string {
  return FLOW_CONTINUITY[seed % FLOW_CONTINUITY.length]
}

export function getSequenceMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    `${id.tone} · emotional sequence remembered`,
    'Cinematic progression emotionally preserved.',
    'Atmosphere escalation continuity held.',
  ]
  return pool[seed % pool.length]
}

export function getExportEmotionalSequenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_SEQUENCE[seed % EXPORT_SEQUENCE.length],
    `${id.label} emotional arc finalized`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalSequenceHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} emotional sequence forming`
  return `Emotionally sequenced · ${sceneCount} beat arc`
}
