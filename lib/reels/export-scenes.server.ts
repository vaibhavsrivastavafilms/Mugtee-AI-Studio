import 'server-only'

import { storeScenesToGenerated } from '@/lib/cinematic/generation'
import type { CinematicScene } from '@/stores/cinematic-project'
import { ensureExportSafeScenes } from '@/lib/export/export-placeholders'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  isEphemeralExportImageUrl,
} from '@/lib/export/scene-export-validation'

/** Map hydrated cinematic scenes to Remotion export input (no import from export-api). */
export function scenesForReelExport(scenes: CinematicScene[]) {
  const safeScenes = ensureExportSafeScenes(scenes)
  const withImages = safeScenes.map((scene) => {
    const imageAssetPath =
      resolveSceneExportAssetPath(scene) || scene.imageAssetPath?.trim() || undefined
    const rawUrl = resolveSceneExportImageUrl(scene) ?? scene.imageUrl
    const imageUrl =
      imageAssetPath && isEphemeralExportImageUrl(rawUrl)
        ? undefined
        : (rawUrl ?? undefined)
    return {
      ...scene,
      imageUrl,
      imageAssetPath,
    }
  })
  return storeScenesToGenerated(withImages)
}
