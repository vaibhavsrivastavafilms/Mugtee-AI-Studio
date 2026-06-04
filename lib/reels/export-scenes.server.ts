import 'server-only'

import { storeScenesToGenerated } from '@/lib/cinematic/generation'
import type { CinematicScene } from '@/stores/cinematic-project'
import { resolveSceneExportImageUrl } from '@/lib/export/scene-export-validation'

/** Map hydrated cinematic scenes to Remotion export input (no import from export-api). */
export function scenesForReelExport(scenes: CinematicScene[]) {
  const withImages = scenes.map((scene) => {
    const imageUrl = resolveSceneExportImageUrl(scene)
    const imageAssetPath = scene.imageAssetPath?.trim() || undefined
    if (!imageUrl && !imageAssetPath) return scene
    return {
      ...scene,
      ...(imageUrl ? { imageUrl } : {}),
      imageAssetPath,
    }
  })
  return storeScenesToGenerated(withImages)
}
