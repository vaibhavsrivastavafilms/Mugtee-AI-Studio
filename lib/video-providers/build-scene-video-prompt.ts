import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import { getMotionPreset, type MotionPresetId } from '@/lib/motion/motion-presets'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { BuildSceneVideoInputOptions, SceneBlueprintInput } from '@/lib/video-providers/types'

function clampSeedanceDuration(durationSec?: number): number {
  const raw = durationSec ?? 5
  if (raw <= 5) return 5
  if (raw <= 10) return 10
  return 15
}

/** Build cinematic Seedance prompt from blueprint + motion preset — not generic. */
export function buildSceneVideoPrompt(
  scene: GeneratedScene,
  blueprint: SceneBlueprint | null,
  motionPresetId: MotionPresetId,
  sceneMotion?: SceneMotionMap | null
): string {
  const preset = getMotionPreset(motionPresetId)
  const motionEntry = sceneMotion?.[scene.id]
  const motionLine =
    motionEntry?.motionType?.replace(/_/g, ' ') ||
    blueprint?.movementStyle ||
    preset.description

  const parts = [
    `${preset.name}. ${motionLine}.`,
    blueprint
      ? `${blueprint.movementStyle}. ${blueprint.location}. ${blueprint.lighting}. Palette: ${blueprint.colorPalette}.`
      : null,
    blueprint
      ? `${blueprint.subject}. ${blueprint.action}. Mood: ${blueprint.emotion}.`
      : scene.visualPrompt || scene.description,
    scene.cameraAngle ? `Camera: ${scene.cameraAngle}.` : null,
    'Vertical cinematic social video, smooth motivated motion, photoreal.',
  ].filter(Boolean)

  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 900)
}

export function buildSceneBlueprintInput(
  scene: GeneratedScene,
  options: {
    blueprint?: SceneBlueprint | null
    motionPresetId: MotionPresetId
    sceneMotion?: SceneMotionMap | null
  } & BuildSceneVideoInputOptions
): SceneBlueprintInput {
  const blueprint = options.blueprint ?? null
  const preset = getMotionPreset(options.motionPresetId)
  const motionEntry = options.sceneMotion?.[scene.id]

  return {
    sceneId: scene.id,
    narration: scene.description || scene.title || '',
    imagePrompt: scene.imagePrompt || scene.visualPrompt || scene.description,
    motionDirection: buildSceneVideoPrompt(
      scene,
      blueprint,
      options.motionPresetId,
      options.sceneMotion
    ),
    cameraMovement:
      motionEntry?.motionType?.replace(/_/g, ' ') ||
      blueprint?.cameraAngle ||
      preset.name,
    duration: clampSeedanceDuration(scene.duration),
    visualStyle: options.visualStyle?.label || options.visualStyle?.palette,
    imageUrl: options.imageUrl ?? scene.imageUrl ?? null,
  }
}
