import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicScene } from '@/stores/cinematic-project'

export type PacingProfile = 'slow-burn' | 'balanced' | 'high-tension' | 'documentary'

const PACING_LINES: Record<PacingProfile, readonly string[]> = {
  'slow-burn': [
    'Slow-burn pacing preserved',
    'Emotional tension building steadily',
    'Contemplative rhythm maintained',
  ],
  balanced: [
    'Visual rhythm remains balanced',
    'Pacing flow stays cohesive',
    'Emotional cadence aligned across beats',
  ],
  'high-tension': [
    'Emotional tension building steadily',
    'Retention rhythm held across beats',
    'Escalation continuity preserved',
  ],
  documentary: [
    'Documentary realism maintained',
    'Observational pacing preserved',
    'Visual rhythm remains balanced',
  ],
}

const ESCALATION_PHASES = [
  'Opening atmosphere',
  'Emotional lift',
  'Tension building',
  'Peak beat',
  'Landing rhythm',
] as const

export function derivePacingProfile(
  style?: string | null,
  niche?: string | null,
  duration = 60
): PacingProfile {
  const key = (niche || style || '').toLowerCase()
  if (key.includes('documentary')) return 'documentary'
  if (key.includes('psychology') || key.includes('emotional')) return 'high-tension'
  if (key.includes('spirituality') || key.includes('luxury')) return 'slow-burn'
  if (duration <= 30) return 'high-tension'
  if (duration >= 75) return 'slow-burn'
  return 'balanced'
}

export function getPacingIntelligenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const profile = derivePacingProfile(style, niche)
  const pool = PACING_LINES[profile]
  return pool[seed % pool.length]
}

export function getEscalationLabel(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  niche?: string | null
): string {
  if (totalScenes <= 1) return 'Single-beat arc'
  const ratio = (sceneIndex - 1) / Math.max(totalScenes - 1, 1)
  const phaseIndex = Math.min(
    ESCALATION_PHASES.length - 1,
    Math.floor(ratio * ESCALATION_PHASES.length)
  )
  const id = resolveCreatorIdentity(style, niche)
  if (ratio < 0.25) return `${ESCALATION_PHASES[0]} · ${id.tone.toLowerCase()}`
  if (ratio > 0.75) return `${ESCALATION_PHASES[4]} · arc closing`
  return `${ESCALATION_PHASES[phaseIndex]} · emotional flow`
}

export type RhythmMapBeat = {
  index: number
  label: string
  intensity: number
  phase: string
}

export function buildRhythmMap(
  scenes: Pick<CinematicScene, 'index' | 'emotion' | 'duration'>[],
  style?: string | null,
  niche?: string | null
): RhythmMapBeat[] {
  const total = scenes.length
  return scenes.map((scene, i) => ({
    index: scene.index,
    label: scene.emotion || getEscalationLabel(scene.index, total, style, niche),
    intensity: Math.min(5, 2 + Math.floor((i / Math.max(total - 1, 1)) * 3)),
    phase: ESCALATION_PHASES[Math.min(i, ESCALATION_PHASES.length - 1)],
  }))
}

export function getPacingBalanceLabel(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const profile = derivePacingProfile(style, niche)
  const lines: Record<PacingProfile, string[]> = {
    'slow-burn': ['Slow-burn balance held', 'Contemplative arc balanced'],
    balanced: ['Visual rhythm remains balanced', 'Pacing evenly distributed'],
    'high-tension': ['Tension arc balanced', 'Escalation rhythm aligned'],
    documentary: ['Documentary pacing balanced', 'Observational flow aligned'],
  }
  const pool = lines[profile]
  return pool[seed % pool.length]
}

export function getSceneEmotionalBridge(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  niche?: string | null
): string | null {
  if (sceneIndex <= 1 || totalScenes <= 1) return null
  const id = resolveCreatorIdentity(style, niche)
  return `Maintaining ${id.tone.toLowerCase()} between scenes`
}

export function getVisualContinuityThread(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    `Visual continuity thread · ${id.rhythm.toLowerCase()}`,
    'Transition tension remains cohesive',
    `${id.tone} · atmosphere aligned`,
  ]
  return pool[seed % pool.length]
}

export function getNarrativeFlowMarker(
  sceneIndex: number,
  totalScenes: number
): string {
  if (sceneIndex === 1) return 'Arc opening · narrative entry'
  if (sceneIndex === totalScenes) return 'Arc landing · emotional close'
  return `Flow beat ${sceneIndex} of ${totalScenes}`
}

export function getCinematicTransitionGuide(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null
): string | null {
  if (sceneIndex >= totalScenes) return null
  const profile = derivePacingProfile(style, null)
  if (profile === 'documentary') return 'Transition holds documentary realism'
  if (profile === 'slow-burn') return 'Transition preserves slow-burn rhythm'
  return 'Transition rhythm remains cohesive'
}

export const REFINEMENT_CONFIDENCE_LINES = [
  'Visual pacing continuity protected',
  'Your cinematic structure remains intact',
  'Only the selected emotional beat is evolving',
  'Scene rhythm preserved during refinement',
] as const

export function getRefinementConfidenceLine(seed = 0): string {
  return REFINEMENT_CONFIDENCE_LINES[seed % REFINEMENT_CONFIDENCE_LINES.length]
}

export const CONTINUITY_PRESERVATION_LINES = [
  'Pacing structure protected throughout',
  'Narrative continuity maintained',
  'Your directed arc remains intact',
] as const

export function getContinuityPreservationNote(seed = 0): string {
  return CONTINUITY_PRESERVATION_LINES[seed % CONTINUITY_PRESERVATION_LINES.length]
}

export const SELECTIVE_REFINE_LINES = [
  'Only this beat is being reshaped',
  'Surrounding rhythm stays preserved',
  'Selected moment evolving · arc intact',
] as const

export function getSelectiveRefineGuidance(seed = 0): string {
  return SELECTIVE_REFINE_LINES[seed % SELECTIVE_REFINE_LINES.length]
}

export const EMOTIONAL_REFINE_LINES = [
  'Emotional landing beat preserved',
  'Refining with pacing continuity',
  'Visual mood deepening · structure intact',
] as const

export function getEmotionalRefinePresence(seed = 0): string {
  return EMOTIONAL_REFINE_LINES[seed % EMOTIONAL_REFINE_LINES.length]
}

export type GuidanceContext =
  | 'preview'
  | 'director'
  | 'scenes'
  | 'hook'
  | 'export'

const WHISPER_LINES: Record<GuidanceContext, string[]> = {
  preview: ['Visual pacing aligned', 'Screenplay rhythm coherent'],
  director: ['Directing mood preserved', 'Emotional intent maintained'],
  scenes: ['Scene atmosphere connected', 'Visual weight balanced'],
  hook: ['Hook tension holding attention', 'Opening beat anchored'],
  export: ['Sequence rhythm finalized', 'Cinematic delivery aligned'],
}

export function getDirectingWhisper(
  context: GuidanceContext,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    ...WHISPER_LINES[context],
    `${id.tone} maintained`,
  ]
  return pool[seed % pool.length]
}

export function getHookTensionMarker(hook?: string | null): string {
  if (!hook?.trim()) return 'Opening beat awaiting direction'
  const len = hook.trim().length
  if (len > 120) return 'Hook tension holding attention'
  if (len > 60) return 'Retention trigger established'
  return 'Opening curiosity anchored'
}

export function getVisualWeightIndicator(
  scene: Pick<CinematicScene, 'emotion' | 'duration' | 'index'>,
  totalScenes: number
): string {
  const dur = scene.duration ?? 0
  if (dur >= 8 || scene.index === totalScenes) return 'Heavy emotional landing'
  if (scene.emotion?.toLowerCase().includes('tension')) return 'Elevated visual weight'
  if (scene.index === 1) return 'Opening visual weight'
  return 'Balanced scene presence'
}

export function getCinematicBalanceChip(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.pacing} · balanced`
}

export function getExportPacingReassurance(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const profile = derivePacingProfile(style, niche)
  const id = resolveCreatorIdentity(style, niche)
  if (profile === 'documentary') {
    return 'Documentary tension arc preserved.'
  }
  const pool = [
    'Your emotional pacing remains cohesive.',
    'Visual rhythm finalized for cinematic delivery.',
    `${id.label} tension arc preserved.`,
  ]
  return pool[seed % pool.length]
}

export function sceneIntensityLevel(
  sceneIndex: number,
  totalScenes: number,
  active = false
): number {
  const base = 2 + Math.floor((sceneIndex / Math.max(totalScenes, 1)) * 2)
  return active ? Math.min(5, base + 1) : Math.max(1, base - 1)
}
