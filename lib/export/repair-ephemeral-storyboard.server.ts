import 'server-only'

import type { CinematicScene } from '@/stores/cinematic-project'
import { persistRemoteImage } from '@/lib/ai/generate-scene-image'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
} from '@/lib/storyboard/storyboard-asset'

/** Upload pollinations (and other ephemeral) scene stills to project-assets before export. */
export async function repairEphemeralStoryboardScenes(params: {
  userId: string
  projectId: string
  scenes: CinematicScene[]
}): Promise<{ scenes: CinematicScene[]; repaired: number }> {
  const userId = params.userId.trim()
  const projectId = params.projectId.trim()
  if (!userId || !projectId || params.scenes.length < 1) {
    return { scenes: params.scenes, repaired: 0 }
  }

  const { persistSceneImageAsset } = await import(
    '@/lib/project-assets/persist-scene-image.server'
  )

  let repaired = 0
  const scenes = [...params.scenes]

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const existingPath = resolveSceneExportAssetPath(scene)
    if (existingPath && isDurableStoryboardPath(existingPath)) continue

    const imageUrl = resolveSceneExportImageUrl(scene)
    if (!imageUrl || !isEphemeralRemoteImageUrl(imageUrl)) continue

    const filename = `${userId}/faceless/scene_${scene.id}_export_repair_${Date.now()}.png`
    const persisted = await persistRemoteImage({
      remoteUrl: imageUrl,
      userId,
      filename,
    })
    const storagePath =
      extractStoragePathFromUrl(persisted) ??
      (persisted.includes('/project-assets/') ? filename : null)
    if (!storagePath || !isDurableStoryboardPath(storagePath)) continue

    const next: CinematicScene = {
      ...scene,
      imageUrl: persisted,
      imageAssetPath: storagePath,
    }
    scenes[i] = next
    repaired += 1

    await persistSceneImageAsset({
      userId,
      projectId,
      url: persisted,
      storagePath,
      prompt: scene.imagePrompt ?? null,
      title: scene.title ?? null,
      sceneId: scene.id,
      sequenceIndex: i + 1,
      metadata: { source: 'export-repair-ephemeral' },
    })
  }

  return { scenes, repaired }
}
