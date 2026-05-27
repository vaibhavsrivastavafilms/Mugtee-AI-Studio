import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicScene } from '@/stores/cinematic-project'

const CAMERA_DIRECTION = [
  'Slow tracking composition',
  'Close emotional framing',
  'Wide observational frame',
  'Intimate portrait composition',
] as const

const LIGHTING_PRESENCE = [
  'Warm documentary lighting',
  'Soft cinematic glow',
  'Low-key emotional lighting',
  'Natural ambient warmth',
] as const

const MOVEMENT_INDICATOR = [
  'Drifting cinematic movement',
  'Held emotional stillness',
  'Gentle push-in rhythm',
  'Observational drift',
] as const

const VISUAL_THREAD = [
  'Visual continuity held across beats',
  'Cinematic palette alignment preserved',
  'Scene atmosphere remains aligned',
] as const

const COLOR_PRESENCE = [
  'Warm tension palette remains consistent',
  'Documentary realism preserved visually',
  'Emotional color world held steady',
] as const

const EXPORT_VISUAL = [
  'Your cinematic visual sequence is finalized.',
  'Scene atmosphere preserved through export.',
  'Visual directing continuity complete.',
] as const

export function getCameraDirectionLine(
  scene?: Pick<CinematicScene, 'cameraAngle' | 'camera'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.cameraAngle?.trim()) return scene.cameraAngle.trim()
  if (scene?.camera?.trim()) return scene.camera.trim()
  const id = resolveCreatorIdentity(style, null)
  const pool = [CAMERA_DIRECTION[seed % CAMERA_DIRECTION.length], `${id.tone} · composed frame`]
  return pool[seed % pool.length]
}

export function getCompositionGuideLine(
  scene?: Pick<CinematicScene, 'environment' | 'visualPrompt'> | null,
  seed = 0
): string {
  if (scene?.environment?.trim()) return `${scene.environment.trim()} · composition`
  const pool = ['Balanced vertical composition', 'Editorial 9:16 framing', 'Cinematic focal weight centered']
  return pool[seed % pool.length]
}

export function getLightingPresenceLine(
  scene?: Pick<CinematicScene, 'lightingMood' | 'lighting'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.lightingMood?.trim()) return scene.lightingMood.trim()
  if (scene?.lighting?.trim()) return scene.lighting.trim()
  const id = resolveCreatorIdentity(style, null)
  return LIGHTING_PRESENCE[seed % LIGHTING_PRESENCE.length] ?? id.tone
}

export function getMovementIndicatorLine(
  scene?: Pick<CinematicScene, 'movementStyle' | 'transition'> | null,
  seed = 0
): string {
  if (scene?.movementStyle?.trim()) return scene.movementStyle.trim()
  if (scene?.transition?.trim()) return `${scene.transition.trim()} · movement`
  return MOVEMENT_INDICATOR[seed % MOVEMENT_INDICATOR.length]
}

export function getVisualThreadLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [VISUAL_THREAD[seed % VISUAL_THREAD.length], `${id.rhythm} · visual thread`]
  return pool[seed % pool.length]
}

export function getEmotionalColorPresence(
  scene?: Pick<CinematicScene, 'colorPalette' | 'emotion'> | null,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  if (scene?.colorPalette?.trim()) return `${scene.colorPalette.trim()} · palette held`
  const id = resolveCreatorIdentity(style, niche)
  const pool = [COLOR_PRESENCE[seed % COLOR_PRESENCE.length], `${id.tone} · color world`]
  return pool[seed % pool.length]
}

export function getVisualRhythmSequence(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (totalScenes <= 0) return 'Visual rhythm initializing'
  const pool = [
    `Beat ${sceneIndex} · ${totalScenes} frame sequence`,
    'Visual pacing aligned across scenes',
    'Emotional escalation visually staged',
  ]
  return pool[seed % pool.length]
}

export function getAtmosphereBridgeLine(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneIndex >= totalScenes) return `${id.tone} · sequence closure`
  if (sceneIndex <= 1) return `${id.tone} · opening atmosphere`
  return `${id.tone} · atmosphere bridge`
}

export function getFrameLabel(scene: CinematicScene): string {
  const variant = scene.storyboardImages?.find((i) => i.id === scene.activeStoryboardId)
  if (variant?.variantLabel) return variant.variantLabel
  return `Scene ${scene.index} · directed frame`
}

export function getAssetPresenceLine(sceneIndex: number, seed = 0): string {
  const pool = [
    `Production frame · beat ${sceneIndex}`,
    'Cinematic storyboard element',
    'Directed visual production asset',
  ]
  return pool[seed % pool.length]
}

export function getVisualSequenceFlowLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    `Visual sequence · ${sceneIndex} of ${totalScenes}`,
    'Emotional frame flow continues',
    'Cinematic scene progression active',
  ]
  return pool[(seed + sceneIndex) % pool.length]
}

export function getSceneTransitionLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex >= totalScenes) return 'Final visual beat'
  const pool = ['Soft cinematic transition', 'Emotional cut continuity', 'Visual beat handoff']
  return pool[seed % pool.length]
}

export function getFrameRhythmLine(sceneIndex: number, seed = 0): string {
  const pool = ['Frame rhythm held', 'Emotional beat breathing', 'Cinematic pacing steady']
  return pool[(seed + sceneIndex) % pool.length]
}

export function getVisualStoryFlowLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.rhythm} · visual story flow`
}

export function getExportVisualClosureLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_VISUAL[seed % EXPORT_VISUAL.length],
    `${id.label} visual sequence finalized`,
    'Storyboard-to-export continuity preserved',
  ]
  return pool[seed % pool.length]
}

export function getStoryboardWorldHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} visual world forming`
  return `${sceneCount} beat visual production · ${id.label}`
}

export function getProductionPresenceLine(seed = 0): string {
  const pool = [
    'Visual production atmosphere active',
    'Cinematic frame world live',
    'Storyboard directing environment',
  ]
  return pool[seed % pool.length]
}
