'use client'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  allScenesHaveExportImages,
  findScenesMissingExportImages,
  missingScenesExportMessage,
  resolveSceneExportImageUrl,
  type MissingExportScene,
} from '@/lib/export/scene-export-validation'

export type StoryboardAssetCheckLog = {
  frameId: string
  sceneIndex: number
  imageExists: boolean
  imageUrl: string | null
  storageVerified: boolean
}

export function logStoryboardAssetChecks(
  projectId: string | null | undefined,
  scenes: GeneratedScene[]
): StoryboardAssetCheckLog[] {
  const entries = scenes.map((scene, index) => {
    const imageUrl = resolveSceneExportImageUrl(scene)
    const entry: StoryboardAssetCheckLog = {
      frameId: scene.id,
      sceneIndex: index + 1,
      imageExists: Boolean(imageUrl),
      imageUrl,
      storageVerified: Boolean(scene.imageAssetPath?.trim()),
    }
    console.info('[ASSET_CHECK]', {
      projectId: projectId ?? null,
      ...entry,
    })
    return entry
  })
  return entries
}

export function scenesMissingExportImages(scenes: GeneratedScene[]): MissingExportScene[] {
  return findScenesMissingExportImages(scenes)
}

export function storyboardImagesReady(scenes: GeneratedScene[]): boolean {
  return scenes.length > 0 && allScenesHaveExportImages(scenes)
}

export function storyboardImagesError(missing: MissingExportScene[]): string {
  return missingScenesExportMessage(missing)
}

/** POST backfill — refresh storage URLs and regenerate missing stills server-side. */
export async function backfillStoryboardAssetsClient(
  projectId: string
): Promise<{ scenes: GeneratedScene[]; ok: boolean; error?: string }> {
  console.info('[STORYBOARD] backfill_start', { projectId })
  try {
    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/backfill-storyboard-assets`,
      { method: 'POST' }
    )
    const data = (await res.json()) as {
      scenes?: GeneratedScene[]
      error?: string
      ok?: boolean
      missingAssets?: unknown[]
    }
    console.info('[STORYBOARD] backfill_result', {
      projectId,
      status: res.status,
      ok: res.ok,
      sceneCount: Array.isArray(data.scenes) ? data.scenes.length : 0,
      missingAssets: data.missingAssets?.length ?? 0,
      error: data.error ?? null,
    })
    if (Array.isArray(data.scenes) && data.scenes.length > 0) {
      return { scenes: data.scenes, ok: storyboardImagesReady(data.scenes) }
    }
    return {
      scenes: [],
      ok: false,
      error: data.error ?? `Backfill failed (${res.status})`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backfill request failed'
    console.warn('[STORYBOARD] backfill_error', { projectId, message })
    return { scenes: [], ok: false, error: message }
  }
}
