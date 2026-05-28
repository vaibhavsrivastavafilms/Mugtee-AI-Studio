import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type ShotEscalationMemory = {
  priorMovement: string[]
  escalationLevel: number
  suggestedProgression: string
  visualThread: string
}

export function buildShotEscalationMemory(
  scenes: GeneratedScene[],
  sceneIndex: number
): ShotEscalationMemory {
  const total = scenes.length || 1
  const idx = Math.max(0, Math.min(sceneIndex, total - 1))
  const prior = scenes.slice(0, idx)

  const priorMovement = prior
    .map((s) => s.movementStyle || s.cameraAngle)
    .filter(Boolean)
    .slice(-3)

  const role = scenePacingRole(idx + 1, total)
  const escalationLevel =
    role === 'hook' ? 0.2 : role === 'tension' ? 0.5 : role === 'peak' ? 0.9 : role === 'aftertaste' ? 0.35 : 0.65

  const suggestedProgression =
    role === 'peak'
      ? 'intimate push-in — hold on emotional residue'
      : role === 'tension'
        ? 'motivated drift — escalate without chaos'
        : role === 'hook'
          ? 'pattern interrupt — detail or off-center frame'
          : 'controlled pull-back — breathing room'

  const visualThread =
    prior.length > 0
      ? prior[prior.length - 1].colorPalette || prior[prior.length - 1].lightingMood || 'continuity held'
      : scenes[idx]?.colorPalette || 'opening palette'

  return {
    priorMovement,
    escalationLevel,
    suggestedProgression,
    visualThread,
  }
}

export function applyEscalationToScene(
  scene: GeneratedScene,
  memory: ShotEscalationMemory
): GeneratedScene {
  if (scene.cameraAngle.trim()) return scene
  return {
    ...scene,
    cameraAngle: memory.suggestedProgression,
    movementStyle: scene.movementStyle || memory.suggestedProgression,
  }
}
