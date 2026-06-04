import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { generateSceneImageOpenAIPrimary } from '@/lib/ai/generate-scene-image-openai-primary'
import { persistRemoteImage } from '@/lib/ai/generate-scene-image'
import {
  findScenesMissingExportImages,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  sceneHasExportableStoryboard,
} from '@/lib/export/scene-export-validation'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CinematicScene } from '@/stores/cinematic-project'
import {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
} from '@/lib/storyboard/storyboard-asset'
import {
  refreshAllSceneStoryboardUrls,
  storyboardStorageExists,
  type LegacyAssetLookup,
} from '@/lib/storyboard/storyboard-url-service.server'
import type { ProjectAssetCounts } from '@/lib/export/export-readiness.server'
import {
  attachFallbackImage,
  createPlaceholderStoryboard,
} from '@/lib/export/export-placeholders'

function recoveryLog(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[Storyboard Recovery] ${event}`, payload)
}

export type BackfillStoryboardResult = {
  scenes: CinematicScene[]
  repaired: number
  regenerated: number
  recoveredFromAssets: number
  placeholderAttached: number
  persisted: boolean
  missingSceneIds: string[]
  errors: string[]
}

async function tryPersistRemoteToStorage(params: {
  remoteUrl: string
  userId: string
  projectId: string
  scene: CinematicScene
  sequenceIndex: number
}): Promise<{ url: string; assetPath: string } | null> {
  const filename = `${params.userId}/cinematic/${params.projectId}/sb_recover_${params.scene.id}_${Date.now()}.png`
  const persisted = await persistRemoteImage({
    remoteUrl: params.remoteUrl,
    userId: params.userId,
    filename,
  })
  const assetPath =
    extractStoragePathFromUrl(persisted) ??
    (persisted.includes('/project-assets/') ? filename : null)
  if (!assetPath || !isDurableStoryboardPath(assetPath)) return null

  const { persistSceneImageAsset } = await import(
    '@/lib/project-assets/persist-scene-image.server'
  )
  await persistSceneImageAsset({
    userId: params.userId,
    projectId: params.projectId,
    url: persisted,
    storagePath: assetPath,
    prompt: params.scene.imagePrompt ?? null,
    title: params.scene.title ?? null,
    sceneId: params.scene.id,
    sequenceIndex: params.sequenceIndex,
    metadata: { source: 'backfill-refetch' },
  })

  return { url: persisted, assetPath }
}

async function regenerateSceneStill(params: {
  scene: CinematicScene
  userId: string
  projectId: string
  sequenceIndex: number
}): Promise<{ url: string; assetPath: string } | null> {
  const prompt =
    params.scene.imagePrompt?.trim() ||
    params.scene.visualPrompt?.trim() ||
    params.scene.title?.trim()
  if (!prompt) return null

  const filename = `${params.userId}/cinematic/${params.projectId}/sb_regen_${params.scene.id}_${Date.now()}.png`
  const result = await generateSceneImageOpenAIPrimary(prompt, {
    filename,
    userId: params.userId,
    aspectRatio: '9:16',
  })
  const url = result.url?.trim()
  if (!url) return null

  const assetPath =
    extractStoragePathFromUrl(url) ?? (url.includes('/project-assets/') ? filename : null)
  if (!assetPath || !isDurableStoryboardPath(assetPath)) return null

  const { persistSceneImageAsset } = await import(
    '@/lib/project-assets/persist-scene-image.server'
  )
  await persistSceneImageAsset({
    userId: params.userId,
    projectId: params.projectId,
    url,
    storagePath: assetPath,
    prompt,
    title: params.scene.title ?? null,
    sceneId: params.scene.id,
    sequenceIndex: params.sequenceIndex,
    metadata: { source: 'backfill-regenerate', provider: result.provider ?? null },
  })

  return { url, assetPath }
}

/** Full legacy recovery: project_assets → refetch ephemeral → regenerate → refresh URLs. */
export async function backfillStoryboardAssetsForProject(params: {
  row: Pick<CinematicProjectRow, 'id' | 'scenes' | 'storyboard'>
  userId: string
  assetCounts?: ProjectAssetCounts
  supabase?: SupabaseClient
  persistScenes?: boolean
  allowRegenerate?: boolean
  attachPlaceholders?: boolean
}): Promise<BackfillStoryboardResult> {
  const userId = params.userId.trim()
  const projectId = params.row.id.trim()
  let supabase: SupabaseClient
  try {
    supabase = params.supabase ?? createSupabaseServerClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Supabase unavailable'
    return {
      scenes: resolveProjectScenes(params.row),
      repaired: 0,
      regenerated: 0,
      recoveredFromAssets: 0,
      placeholderAttached: 0,
      persisted: false,
      missingSceneIds: findScenesMissingExportImages(resolveProjectScenes(params.row)).map(
        (m) => m.id
      ),
      errors: [message],
    }
  }

  let scenes = resolveProjectScenes(params.row)
  const lookup: LegacyAssetLookup = {
    projectId,
    userId,
    imageAssets: params.assetCounts?.imageAssets,
  }

  try {
    scenes = await refreshAllSceneStoryboardUrls(scenes, { lookup, supabase })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    recoveryLog('refresh.initial_failed', { projectId, message })
  }

  let repaired = 0
  let regenerated = 0
  let recoveredFromAssets = 0
  let placeholderAttached = 0
  const errors: string[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    try {
      let assetPath = resolveSceneExportAssetPath(scene)
      if (assetPath && (await storyboardStorageExists(assetPath, supabase))) {
        continue
      }

      const imageUrl = resolveSceneExportImageUrl(scene)
      if (!imageUrl) {
        console.warn('[EXPORT] Missing image for scene', scene.id)
        continue
      }

      if (!assetPath && imageUrl) {
        const fromAssets = lookup.imageAssets?.find(
          (a) => a.sceneId === scene.id || a.sequenceIndex === i + 1
        )
        if (fromAssets?.storagePath && isDurableStoryboardPath(fromAssets.storagePath)) {
          assetPath = fromAssets.storagePath
          recoveredFromAssets += 1
          recoveryLog('project_assets.storage_path', { sceneId: scene.id, assetPath })
        } else if (fromAssets?.url) {
          const refetched = await tryPersistRemoteToStorage({
            remoteUrl: fromAssets.url,
            userId,
            projectId,
            scene,
            sequenceIndex: i + 1,
          })
          if (refetched) {
            scenes[i] = {
              ...scene,
              imageUrl: refetched.url,
              imageAssetPath: refetched.assetPath,
            }
            repaired += 1
            recoveryLog('project_assets.refetch', { sceneId: scene.id })
            continue
          }
        }
      }

      if (imageUrl && isEphemeralRemoteImageUrl(imageUrl)) {
        const refetched = await tryPersistRemoteToStorage({
          remoteUrl: imageUrl,
          userId,
          projectId,
          scene,
          sequenceIndex: i + 1,
        })
        if (refetched) {
          scenes[i] = {
            ...scene,
            imageUrl: refetched.url,
            imageAssetPath: refetched.assetPath,
          }
          repaired += 1
          recoveryLog('ephemeral.refetch', { sceneId: scene.id })
          continue
        }

        if (params.allowRegenerate !== false) {
          const regen = await regenerateSceneStill({
            scene,
            userId,
            projectId,
            sequenceIndex: i + 1,
          })
          if (regen) {
            scenes[i] = {
              ...scene,
              imageUrl: regen.url,
              imageAssetPath: regen.assetPath,
            }
            regenerated += 1
            recoveryLog('ephemeral.regenerate', { sceneId: scene.id })
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`Scene ${scene.id}: ${message}`)
      recoveryLog('scene.error', { sceneId: scene.id, message })
    }
  }

  try {
    scenes = await refreshAllSceneStoryboardUrls(scenes, { lookup, supabase })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`refresh: ${message}`)
    recoveryLog('refresh.final_failed', { projectId, message })
  }

  if (params.attachPlaceholders !== false) {
    scenes = scenes.map((scene, index) => {
      if (sceneHasExportableStoryboard(scene)) {
        return attachFallbackImage(scene, index)
      }
      placeholderAttached += 1
      recoveryLog('placeholder.attach', { sceneId: scene.id, index: index + 1 })
      return createPlaceholderStoryboard(scene, index)
    })
  }

  let persisted = false
  if (
    params.persistScenes !== false &&
    (repaired > 0 || regenerated > 0 || recoveredFromAssets > 0 || placeholderAttached > 0)
  ) {
    const { error } = await supabase
      .from('cinematic_projects')
      .update({
        scenes,
        storyboard: scenes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', userId)

    persisted = !error
    recoveryLog('persist.scenes', {
      projectId,
      repaired,
      regenerated,
      recoveredFromAssets,
      ok: persisted,
      error: error?.message,
    })
  }

  recoveryLog('complete', {
    projectId,
    sceneCount: scenes.length,
    exportable: scenes.filter((s) => sceneHasExportableStoryboard(s)).length,
    withAssetPath: scenes.filter((s) => resolveSceneExportAssetPath(s)).length,
    repaired,
    regenerated,
    recoveredFromAssets,
    errors: errors.length,
  })

  const missingSceneIds = findScenesMissingExportImages(scenes).map((m) => m.id)

  return {
    scenes,
    repaired,
    regenerated,
    recoveredFromAssets,
    placeholderAttached,
    persisted,
    missingSceneIds,
    errors,
  }
}
