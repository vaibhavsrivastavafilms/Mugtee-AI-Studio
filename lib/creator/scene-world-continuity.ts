import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { buildShotEscalationMemory } from '@/lib/cinematic/storyboard/shot-escalation-memory'
import type { CinematicScene } from '@/stores/cinematic-project'

const CONTINUITY_LINES = [
  'Warm emotional realism continues.',
  'Visual atmosphere remains aligned.',
  'Documentary atmosphere remains aligned.',
  'Environmental pacing held steady.',
] as const

export function getSceneWorldContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneIndex <= 1) return `${id.tone} · opening world held`
  if (sceneIndex >= totalScenes) return `${id.tone} · world sequence closure`
  return CONTINUITY_LINES[seed % CONTINUITY_LINES.length]
}

export function getEscalationContinuityLine(
  scenes: CinematicScene[],
  sceneIndex: number,
  seed = 0
): string {
  const generated = scenes.map((s) => ({
    id: s.id,
    title: s.title ?? '',
    description: s.narration ?? '',
    duration: s.duration ?? 0,
    visualPrompt: s.visualPrompt ?? '',
    cameraAngle: s.cameraAngle ?? s.camera ?? '',
    lightingMood: s.lightingMood ?? s.lighting ?? '',
    environment: s.environment ?? '',
    colorPalette: s.colorPalette ?? '',
    movementStyle: s.movementStyle ?? '',
  }))
  const memory = buildShotEscalationMemory(generated, sceneIndex - 1)

  if (memory.escalationLevel >= 0.85) {
    return 'Peak emotional world · intensity held'
  }
  if (memory.escalationLevel <= 0.25) {
    return 'Opening atmosphere · world forming'
  }

  const pool = [
    memory.visualThread !== 'continuity held' && memory.visualThread !== 'opening palette'
      ? `${memory.visualThread} · continuity`
      : CONTINUITY_LINES[seed % CONTINUITY_LINES.length],
    'Visual atmosphere remains aligned.',
  ]
  return pool[seed % pool.length] ?? CONTINUITY_LINES[0]
}
