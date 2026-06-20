'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { StoryboardImage } from '@/stores/cinematic-project'
import {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
  STORYBOARD_STORAGE_BUCKET,
} from '@/lib/storyboard/storyboard-asset'

export type StoryboardUrlScene = {
  id: string
  imageUrl?: string | null
  imageAssetPath?: string | null
  imageAssetId?: string | null
  thumbnailUrl?: string | null
  activeStoryboardId?: string
  storyboardImages?: StoryboardImage[]
}

function devLog(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[storyboard-url:client] ${event}`, payload)
}

/** Browser hydration — public bucket URLs from stored assetPath. */
export function refreshStoryboardUrlClient(assetPath: string): string | null {
  const path = assetPath?.trim()
  if (!isDurableStoryboardPath(path)) return null
  const supabase = createSupabaseBrowserClient()
  if (!supabase) return null
  const { data } = supabase.storage.from(STORYBOARD_STORAGE_BUCKET).getPublicUrl(path!)
  return data?.publicUrl ?? null
}

function refreshStoryboardImageClient(img: StoryboardImage): StoryboardImage {
  const assetPath =
    (img.assetPath && isDurableStoryboardPath(img.assetPath) ? img.assetPath.trim() : null) ??
    extractStoragePathFromUrl(img.url)
  if (!assetPath) return img
  const url = refreshStoryboardUrlClient(assetPath) ?? img.url
  return { ...img, assetPath, url }
}

export function refreshSceneStoryboardUrlsClient<T extends StoryboardUrlScene>(scene: T): T {
  const storyboardImages = (scene.storyboardImages ?? []).map(refreshStoryboardImageClient)

  let assetPath =
    (scene.imageAssetPath && isDurableStoryboardPath(scene.imageAssetPath)
      ? scene.imageAssetPath.trim()
      : null) ?? extractStoragePathFromUrl(scene.imageUrl)

  if (!assetPath && storyboardImages.length > 0) {
    const active =
      storyboardImages.find((img) => img.id === scene.activeStoryboardId) ??
      storyboardImages[0]
    assetPath = active?.assetPath ?? extractStoragePathFromUrl(active?.url) ?? null
  }

  if (!assetPath) {
    return storyboardImages.length ? { ...scene, storyboardImages } : scene
  }

  const imageUrl = refreshStoryboardUrlClient(assetPath) ?? scene.imageUrl
  const active =
    storyboardImages.find((img) => img.id === scene.activeStoryboardId) ??
    storyboardImages[0]

  devLog('refresh.scene', { sceneId: scene.id, assetPath })

  return {
    ...scene,
    imageAssetPath: assetPath,
    imageUrl: active?.url ?? imageUrl,
    thumbnailUrl: active?.url ?? imageUrl,
  }
}

export function refreshAllSceneStoryboardUrlsClient<T extends StoryboardUrlScene>(
  scenes: T[]
): T[] {
  return scenes.map(refreshSceneStoryboardUrlsClient)
}
