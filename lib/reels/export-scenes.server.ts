import 'server-only'

import { storeScenesToGenerated } from '@/lib/cinematic/generation'
import type { CinematicScene } from '@/stores/cinematic-project'
import { ensureExportSafeScenes } from '@/lib/export/export-placeholders'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'

/** Map hydrated cinematic scenes to Remotion export input (no import from export-api). */
export function scenesForReelExport(scenes: CinematicScene[]) {
  const safeScenes = ensureExportSafeScenes(scenes)
  const withImages = safeScenes.map((scene) => {
    const imageUrl = resolveSceneExportImageUrl(scene)
    const imageAssetPath =
      resolveSceneExportAssetPath(scene) || scene.imageAssetPath?.trim() || undefined
    return {
      ...scene,
      imageUrl: imageUrl ?? scene.imageUrl,
      imageAssetPath,
    }
  })
  return storeScenesToGenerated(withImages)
}
