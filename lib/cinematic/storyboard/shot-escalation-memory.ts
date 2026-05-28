import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import {
  cameraLanguageForSceneIndex,
  formatCameraLanguageBlock,
} from '@/lib/cinematic/storyboard/emotional-camera-language'

export type ShotEscalationMemory = {
  priorMovement: string[]
  escalationLevel: number
  suggestedProgression: string
  visualThread: string
}

const PROGRESSION_POOL: Record<string, readonly string[]> = {
  hook: [
    'pattern interrupt — detail insert',
    'off-center frame — curiosity before commitment',
    'macro detail — world opens in fragments',
  ],
  tension: [
    'motivated drift — escalate without chaos',
    'handheld push — stakes gathering quietly',
    'lateral track — unease through movement',
  ],
  peak: [
    'intimate push-in — hold on emotional residue',
    'locked close — breath held at crest',
    'slow dissolve into intimacy',
  ],
  release: [
    'controlled pull-back — breathing room',
    'wider frame — context returns gently',
    'exhale into observational stillness',
  ],
  aftertaste: [
    'still frame on residue — memory lingers',
    'minimal hold — echo after the cut',
    'held wide — what remains after feeling',
  ],
}

function pickProgression(role: string, priorMovement: string[], sceneIndex: number): string {
  const pool = PROGRESSION_POOL[role] ?? PROGRESSION_POOL.release
  const priorSet = new Set(priorMovement.map((m) => m.toLowerCase()))
  const fresh = pool.filter((line) => !priorSet.has(line.toLowerCase()))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[sceneIndex % candidates.length]
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

  const suggestedProgression = pickProgression(role, priorMovement, idx)

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
  memory: ShotEscalationMemory,
  sceneIndex: number,
  totalScenes: number
): GeneratedScene {
  if (scene.cameraAngle.trim()) return scene

  const repeatsPrior = memory.priorMovement.some(
    (m) => m.toLowerCase() === memory.suggestedProgression.toLowerCase()
  )
  const cameraAngle = repeatsPrior
    ? formatCameraLanguageBlock(cameraLanguageForSceneIndex(sceneIndex, totalScenes))
    : memory.suggestedProgression

  return {
    ...scene,
    cameraAngle,
    movementStyle: scene.movementStyle || memory.suggestedProgression,
  }
}
