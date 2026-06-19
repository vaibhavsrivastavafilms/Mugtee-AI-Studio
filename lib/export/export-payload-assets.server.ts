import 'server-only'

import type { ExportRequestPayload } from '@/lib/export/export-schema'
import { safeExportSceneRows } from '@/lib/export/export-schema'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  sceneHasExportableStoryboard,
  type SceneExportImageSource,
} from '@/lib/export/scene-export-validation'

export type ExportPayloadMissingAsset = {
  kind: 'scene' | 'image' | 'voice' | 'thumbnail'
  sceneIndex?: number
  sceneId?: string
  field: string
  message: string
}

function sceneRowsFromPayload(data: ExportRequestPayload): SceneExportImageSource[] {
  const storyboards = safeExportSceneRows(data.storyboards)
  const scenes = safeExportSceneRows(data.scenes)
  const rows = storyboards.length > 0 ? storyboards : scenes
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    imageAssetPath: row.imageAssetPath,
  }))
}

/** Pre-queue gate on client snapshot — returns missing assets without throwing. */
export function collectPayloadMissingAssets(params: {
  data: ExportRequestPayload
  includeVoiceover: boolean
  /** DB/storage-resolved narration URL when payload omits voiceUrl. */
  resolvedVoiceUrl?: string | null
}): ExportPayloadMissingAsset[] {
  const missing: ExportPayloadMissingAsset[] = []
  const rows = sceneRowsFromPayload(params.data)

  if (rows.length < 1) {
    missing.push({
      kind: 'scene',
      field: 'scenes',
      message: 'At least one storyboard scene is required in the export payload.',
    })
    return missing
  }

  rows.forEach((scene, index) => {
    const imageUrl = resolveSceneExportImageUrl(scene)
    const assetPath = resolveSceneExportAssetPath(scene)
    if (!sceneHasExportableStoryboard(scene)) {
      missing.push({
        kind: 'image',
        sceneIndex: index + 1,
        sceneId: scene.id,
        field: 'imageUrl',
        message: `Scene ${index + 1} is missing imageUrl or imageAssetPath.`,
      })
      console.log('[EXPORT API] missing_asset', {
        sceneIndex: index + 1,
        sceneId: scene.id,
        imageUrl: imageUrl ?? null,
        imageAssetPath: assetPath ?? null,
      })
    }
  })

  if (params.includeVoiceover) {
    const payloadVoiceUrl = (params.data.voiceUrl ?? params.data.voiceover)?.trim()
    const voiceUrl = payloadVoiceUrl || params.resolvedVoiceUrl?.trim() || null
    if (!voiceUrl) {
      missing.push({
        kind: 'voice',
        field: 'voiceUrl',
        message: 'Voice narration URL is required before exporting.',
      })
      console.log('[EXPORT API] missing_asset', {
        field: 'voiceUrl',
        payloadVoiceUrl: payloadVoiceUrl ?? null,
        resolvedVoiceUrl: params.resolvedVoiceUrl?.trim() ?? null,
      })
    }
  }

  const thumb = (params.data.thumbnailUrl ?? params.data.thumbnail)?.trim()
  if (!thumb) {
    console.log('[EXPORT API] missing_asset', { field: 'thumbnail', optional: true })
  }

  return missing
}
