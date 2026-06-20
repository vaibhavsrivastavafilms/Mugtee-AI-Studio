import 'server-only'

import {
  isDurableExportImageUrl,
  isEphemeralExportImageUrl,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  type SceneExportImageSource,
} from '@/lib/export/scene-export-validation'
import { refreshStoryboardUrl } from '@/lib/storyboard/storyboard-url-service.server'

/** Storage path is source of truth ΓÇö never prefer Pollinations URLs for Remotion download. */
export async function resolveSceneRenderImageUrl(
  scene: SceneExportImageSource
): Promise<string | null> {
  const assetPath = resolveSceneExportAssetPath(scene)
  if (assetPath) {
    const fresh = await refreshStoryboardUrl(assetPath)
    if (fresh) return fresh
  }

  const candidates = [
    resolveSceneExportImageUrl(scene),
    scene.storyboardImages?.find((img) => img.id === scene.activeStoryboardId)?.url,
    scene.storyboardImages?.[0]?.url,
  ]

  for (const candidate of candidates) {
    const url = candidate?.trim()
    if (!url) continue
    if (isEphemeralExportImageUrl(url)) continue
    if (isDurableExportImageUrl(url)) return url
  }

  return null
}
