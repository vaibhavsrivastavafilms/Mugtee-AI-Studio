import type { GeneratedScene } from '@/lib/cinematic/generation'
import { sceneArcRole } from '@/lib/cinematic/regen-context'
import {
  cameraLanguageForSceneIndex,
  formatCameraLanguageBlock,
} from '@/lib/cinematic/storyboard/emotional-camera-language'

export type ShotEscalationMemory = {
  priorMovement: string[]
  escalationLevel: number
  suggestedProgression: string
  visualThread: string
  actBreath: boolean
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

const LONG_FORM_VARIATIONS: readonly string[] = [
  'oblique angle — reframing without rupture',
  'rack focus — attention shifts quietly',
  'slow orbit — world reveals in layers',
  'held medium — restraint before the next lift',
  'detail cutaway — texture between beats',
]

function pickProgression(
  role: string,
  priorMovement: string[],
  sceneIndex: number,
  total: number
): string {
  const pool = PROGRESSION_POOL[role] ?? PROGRESSION_POOL.release
  const priorSet = new Set(priorMovement.map((m) => m.toLowerCase()))
  const fresh = pool.filter((line) => !priorSet.has(line.toLowerCase()))
  let candidates = fresh.length > 0 ? fresh : pool

  if (total >= 10 && role === 'tension') {
    const longFresh = LONG_FORM_VARIATIONS.filter((line) => !priorSet.has(line.toLowerCase()))
    if (longFresh.length > 0 && (sceneIndex % 4 === 0 || (total >= 20 && sceneIndex % 3 === 0))) {
      candidates = longFresh
    }
  }

  if (total >= 20 && role === 'release' && sceneIndex % 6 === 0) {
    candidates = ['held wide — mid-arc breath before next lift', ...candidates]
  }

  return candidates[sceneIndex % candidates.length]
}

function escalationLevelForRole(role: string, total: number, index: number): number {
  const base =
    role === 'hook' ? 0.2 : role === 'tension' ? 0.5 : role === 'peak' ? 0.9 : role === 'aftertaste' ? 0.35 : 0.65
  if (total < 10) return base
  const wave = Math.sin((index / total) * Math.PI * 2) * 0.08
  return Math.min(1, Math.max(0.15, base + wave))
}

export function buildShotEscalationMemory(
  scenes: GeneratedScene[],
  sceneIndex: number
): ShotEscalationMemory {
  const total = scenes.length || 1
  const idx = Math.max(0, Math.min(sceneIndex, total - 1))
  const prior = scenes.slice(0, idx)
  const lookback = total >= 10 ? 5 : 3

  const priorMovement = prior
    .map((s) => s.movementStyle || s.cameraAngle)
    .filter(Boolean)
    .slice(-lookback)

  const role = sceneArcRole(idx + 1, total)
  const escalationLevel = escalationLevelForRole(role, total, idx + 1)
  const suggestedProgression = pickProgression(role, priorMovement, idx, total)
  const actBreath = total >= 10 && role === 'release' && idx > 0 && idx < total - 1

  const visualThread =
    prior.length > 0
      ? prior[prior.length - 1].colorPalette || prior[prior.length - 1].lightingMood || 'continuity held'
      : scenes[idx]?.colorPalette || 'opening palette'

  return {
    priorMovement,
    escalationLevel,
    suggestedProgression,
    visualThread,
    actBreath,
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
