import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicScene } from '@/stores/cinematic-project'

const WORLD_PRESENCE = [
  'Living cinematic story-world active',
  'Environmental atmosphere held',
  'Emotionally connected visual world',
] as const

const SCENE_WORLD = [
  'Warm emotional realism continues.',
  'Visual atmosphere remains aligned.',
  'Documentary atmosphere remains aligned.',
  'Visual emotional tension carries forward.',
] as const

const ENVIRONMENT_DIRECTION = [
  'Muted documentary atmosphere',
  'Warm drifting cinematic realism',
  'Low-light emotional tension',
  'Close environmental framing',
] as const

const STORY_FLOW = [
  'Atmosphere-aware sequence flowing',
  'Environmental cinematic rhythm held',
  'Visual story-world continuity active',
] as const

const WORLD_MEMORY = [
  'Your documentary atmosphere remains preserved.',
  'Warm cinematic continuity continues.',
  'Environmental pacing remains aligned.',
] as const

const EXPORT_WORLD = [
  'Your cinematic world sequence is complete.',
  'Atmospheric continuity preserved through delivery.',
  'Visual environment finalized.',
] as const

export function getStoryWorldPresenceLine(seed = 0): string {
  return WORLD_PRESENCE[seed % WORLD_PRESENCE.length]
}

export function getEnvironmentSequenceLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    `Environmental beat ${sceneIndex} · ${totalScenes} world sequence`,
    'Cinematic environment sequence active',
    'Atmosphere-aware visual world',
  ]
  return pool[seed % pool.length]
}

export function getEmotionalSceneWorldLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [SCENE_WORLD[seed % SCENE_WORLD.length], `${id.tone} · world continuity`]
  return pool[seed % pool.length]
}

export function getAtmosphereThreadLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · atmosphere thread`
}

export function getVisualEmotionBridgeLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex >= totalScenes) return 'World sequence closure'
  if (sceneIndex <= 1) return 'Opening emotional world'
  return SCENE_WORLD[seed % SCENE_WORLD.length]
}

export function getCinematicWorldRhythmLine(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.rhythm} · world rhythm`
}

export function getEnvironmentDirectionLine(
  scene?: Pick<CinematicScene, 'environment' | 'lightingMood' | 'emotion'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.environment?.trim()) return scene.environment.trim()
  if (scene?.lightingMood?.trim()) return scene.lightingMood.trim()
  const id = resolveCreatorIdentity(style, null)
  const pool = [ENVIRONMENT_DIRECTION[seed % ENVIRONMENT_DIRECTION.length], `${id.tone} · environment`]
  return pool[seed % pool.length]
}

export function getLightingEnvironmentLine(
  scene?: Pick<CinematicScene, 'lightingMood' | 'lighting'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.lightingMood?.trim()) return scene.lightingMood.trim()
  if (scene?.lighting?.trim()) return scene.lighting.trim()
  return ENVIRONMENT_DIRECTION[(seed + 1) % ENVIRONMENT_DIRECTION.length]
}

export function getSpatialPresenceLine(seed = 0): string {
  const pool = ['Close environmental framing', 'Spatial cinematic depth held', 'Environmental composition stable']
  return pool[seed % pool.length]
}

export function getVisualMoodEnvironmentLine(
  scene?: Pick<CinematicScene, 'emotion' | 'colorPalette'> | null,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  if (scene?.emotion?.trim()) return `${scene.emotion.trim()} · mood world`
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · mood environment`
}

export function getCinematicStoryFlowLine(seed = 0): string {
  return STORY_FLOW[seed % STORY_FLOW.length]
}

export function getEmotionalAtmosphereSequenceLine(
  sceneIndex: number,
  seed = 0
): string {
  const pool = ['Emotional atmosphere sequence active', `Atmosphere beat ${sceneIndex} aligned`, 'Environmental pacing held']
  return pool[seed % pool.length]
}

export function getVisualRhythmEnvironmentLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.pacing} · rhythm environment`
}

export function getSequencePresenceLine(
  sceneIndex: number,
  totalScenes: number
): string {
  return `Story-world · beat ${sceneIndex} of ${totalScenes}`
}

export function getShotPresenceLine(sceneIndex: number, seed = 0): string {
  const pool = [`Directed shot · beat ${sceneIndex}`, 'Cinematic frame world active', 'Immersive story frame held']
  return pool[seed % pool.length]
}

export function getVisualStoryDepthLine(seed = 0): string {
  const pool = ['Visual story depth preserved', 'Environmental frame immersion', 'Cinematic composition held']
  return pool[seed % pool.length]
}

export function getVisualWorldMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [WORLD_MEMORY[seed % WORLD_MEMORY.length], `${id.tone} · world remembered`]
  return pool[seed % pool.length]
}

export function getAtmosphereMemoryLine(
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.tone} · atmosphere remembered`
}

export function getEmotionalSceneMemoryLine(
  scene?: Pick<CinematicScene, 'emotion' | 'title'> | null,
  seed = 0
): string {
  if (scene?.title?.trim()) return `${scene.title.trim()} · emotional world held`
  return SCENE_WORLD[seed % SCENE_WORLD.length]
}

export function getVisualContinuityMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return `${id.rhythm} · continuity remembered`
}

export function getExportStoryWorldLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_WORLD[seed % EXPORT_WORLD.length],
    `${id.label} world sequence complete`,
    'Atmospheric continuity preserved through delivery.',
  ]
  return pool[seed % pool.length]
}

export function getStoryWorldHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} story-world forming`
  return `Living ${id.label} story-world · ${sceneCount} beats`
}
