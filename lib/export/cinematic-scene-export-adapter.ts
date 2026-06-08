import type { GeneratedScene } from '@/lib/cinematic/generation'
import { fallbackScenePrompt, fallbackSceneTitle } from '@/lib/export/export-placeholders'
import type { CinematicScene } from '@/stores/cinematic-project'

/**
 * Maps a persisted CinematicScene into the GeneratedScene shape expected by
 * export diagnostics. Image/storyboard fields are copied verbatim so readiness
 * checks behave identically to operating on hydrated GeneratedScene rows.
 */
export function cinematicSceneToGeneratedScene(
  scene: CinematicScene,
  index: number
): GeneratedScene {
  const title = fallbackSceneTitle(scene, index)
  const prompt = fallbackScenePrompt(scene, index)
  const narration = scene.narration?.trim() || ''

  return {
    id: scene.id,
    title,
    description: narration || title,
    duration: scene.duration ?? 4,
    visualPrompt: scene.visualPrompt?.trim() || prompt,
    imagePrompt: scene.imagePrompt?.trim() || prompt,
    cameraAngle: scene.cameraAngle?.trim() || scene.camera?.trim() || '',
    lightingMood: scene.lightingMood?.trim() || scene.lighting?.trim() || '',
    environment: scene.environment?.trim() || '',
    colorPalette: scene.colorPalette?.trim() || '',
    movementStyle: scene.movementStyle?.trim() || '',
    imageUrl: scene.imageUrl ?? null,
    imageAssetPath: scene.imageAssetPath ?? null,
    ...(scene.storyboardImages?.length
      ? { storyboardImages: scene.storyboardImages }
      : {}),
    ...(scene.activeStoryboardId ? { activeStoryboardId: scene.activeStoryboardId } : {}),
  }
}

export function cinematicScenesToGeneratedScenes(scenes: CinematicScene[]): GeneratedScene[] {
  return scenes.map((scene, index) => cinematicSceneToGeneratedScene(scene, index))
}
