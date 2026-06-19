import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type { CinematicScene } from '@/stores/cinematic-project'
import type { StoryboardImage } from '@/stores/cinematic-project'
import {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
  STORYBOARD_STORAGE_BUCKET,
  type StoryboardAsset,
} from '@/lib/storyboard/storyboard-asset'

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7

import {
  logPipelineStepComplete,
  logPipelineStepStart,
} from '@/lib/cinematic/generation-logger'

function devLog(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[Storyboard Recovery] ${event}`, payload)
}

/** Fresh URL for a stored storyboard object (signed when possible, else public). */
export async function refreshStoryboardUrl(
  assetPath: string,
  supabase?: SupabaseClient
): Promise<string | null> {
  const path = assetPath?.trim()
  if (!isDurableStoryboardPath(path)) return null

  logPipelineStepStart('storage', null, { assetPath: path })
  console.info('[ASSET_REFRESH]', {
    phase: 'create_signed_url',
    assetPath: path,
    bucket: STORYBOARD_STORAGE_BUCKET,
  })
  const serviceClient = createSupabaseServiceClient()
  const clients = [
    supabase,
    serviceClient,
    serviceClient ? null : createSupabaseServerClient(),
  ].filter(Boolean) as SupabaseClient[]

  for (const client of clients) {
    const { data: signed, error } = await client.storage
      .from(STORYBOARD_STORAGE_BUCKET)
      .createSignedUrl(path!, SIGNED_URL_TTL_SEC)

    if (!error && signed?.signedUrl) {
      devLog('refresh.signed', { assetPath: path })
      console.info('[ASSET_REFRESH]', {
        phase: 'signed_url_created',
        assetPath: path,
        method: 'signed',
      })
      logPipelineStepComplete('storage', null, { assetPath: path, method: 'signed' })
      return signed.signedUrl
    }
  }

  devLog('refresh.failed', { assetPath: path })
  return null
}

export async function storyboardStorageExists(
  assetPath: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const path = assetPath?.trim()
  if (!isDurableStoryboardPath(path)) return false

  const client = createSupabaseServiceClient() ?? supabase ?? createSupabaseServerClient()
  const folder = path!.includes('/') ? path!.slice(0, path!.lastIndexOf('/')) : ''
  const name = path!.includes('/') ? path!.slice(path!.lastIndexOf('/') + 1) : path!

  const { data, error } = await client.storage.from(STORYBOARD_STORAGE_BUCKET).list(folder, {
    limit: 200,
    search: name,
  })

  if (error) {
    devLog('storage.list_error', { assetPath: path, message: error.message })
    return false
  }

  const found = (data ?? []).some((row) => row.name === name)
  devLog('storage.exists', { assetPath: path, found })
  return found
}

export type LegacyAssetLookup = {
  projectId: string
  userId: string
  imageAssets?: Array<{
    sceneId: string | null
    sequenceIndex: number | null
    storagePath: string | null
    url: string
  }>
}

function resolveScenePrimaryAssetPath(scene: CinematicScene): string | null {
  if (isDurableStoryboardPath(scene.imageAssetPath)) return scene.imageAssetPath!.trim()

  const images = scene.storyboardImages ?? []
  const active =
    images.find((img) => img.id === scene.activeStoryboardId) ?? images[0]
  if (active?.assetPath && isDurableStoryboardPath(active.assetPath)) {
    return active.assetPath.trim()
  }

  const fromImageUrl = extractStoragePathFromUrl(scene.imageUrl)
  if (fromImageUrl) return fromImageUrl

  const fromStoryboard = extractStoragePathFromUrl(active?.url)
  if (fromStoryboard) return fromStoryboard

  return null
}

/** Recover storage path from scene JSON, URLs, or project_assets (legacy). */
export async function recoverSceneAssetPath(
  scene: CinematicScene,
  index: number,
  lookup?: LegacyAssetLookup,
  supabase?: SupabaseClient
): Promise<string | null> {
  const direct = resolveScenePrimaryAssetPath(scene)
  if (direct) return direct

  if (!lookup) return null

  const byId = lookup.imageAssets?.find((a) => a.sceneId === scene.id && a.storagePath)
  if (byId?.storagePath && isDurableStoryboardPath(byId.storagePath)) {
    devLog('recover.project_assets.scene_id', { sceneId: scene.id, assetPath: byId.storagePath })
    return byId.storagePath.trim()
  }

  const bySeq = lookup.imageAssets?.find(
    (a) => a.sequenceIndex === index + 1 && a.storagePath
  )
  if (bySeq?.storagePath && isDurableStoryboardPath(bySeq.storagePath)) {
    devLog('recover.project_assets.sequence', { sceneIndex: index + 1, assetPath: bySeq.storagePath })
    return bySeq.storagePath.trim()
  }

  const client = supabase ?? createSupabaseServerClient()
  const { data } = await client
    .from('project_assets')
    .select('storage_path, url, metadata')
    .eq('project_id', lookup.projectId)
    .eq('user_id', lookup.userId)
    .eq('kind', 'image')
    .order('created_at', { ascending: false })
    .limit(80)

  if (!data?.length) return null

  for (const row of data) {
    const meta = (row.metadata as Record<string, unknown> | null) ?? {}
    const metaSceneId =
      typeof meta.scene_id === 'string'
        ? meta.scene_id
        : typeof meta.sceneId === 'string'
          ? meta.sceneId
          : null
    const storagePath = row.storage_path?.trim()
    if (!storagePath || !isDurableStoryboardPath(storagePath)) continue
    if (metaSceneId === scene.id) {
      devLog('recover.db.scene_id', { sceneId: scene.id, assetPath: storagePath })
      return storagePath
    }
    const seq =
      typeof meta.sequence_index === 'number'
        ? meta.sequence_index
        : typeof meta.sequenceIndex === 'number'
          ? meta.sequenceIndex
          : null
    if (seq === index + 1) {
      devLog('recover.db.sequence', { sceneIndex: index + 1, assetPath: storagePath })
      return storagePath
    }
  }

  for (const row of data) {
    const fromUrl = extractStoragePathFromUrl(row.url)
    if (fromUrl && isDurableStoryboardPath(fromUrl)) {
      devLog('recover.db.url_pattern', { sceneId: scene.id, assetPath: fromUrl })
      return fromUrl
    }
  }

  return null
}

async function refreshStoryboardImage(
  img: StoryboardImage,
  supabase: SupabaseClient
): Promise<StoryboardImage> {
  const assetPath =
    (img.assetPath && isDurableStoryboardPath(img.assetPath) ? img.assetPath.trim() : null) ??
    extractStoragePathFromUrl(img.url)
  if (!assetPath) return img

  const imageUrl = (await refreshStoryboardUrl(assetPath, supabase)) ?? img.url
  return { ...img, assetPath, url: imageUrl ?? img.url }
}

/** Hydrate one scene — recover paths, refresh signed/public URLs. */
export async function refreshSceneStoryboardUrls(
  scene: CinematicScene,
  index: number,
  opts?: { lookup?: LegacyAssetLookup; supabase?: SupabaseClient }
): Promise<CinematicScene> {
  const supabase = opts?.supabase ?? createSupabaseServerClient()
  let assetPath = await recoverSceneAssetPath(scene, index, opts?.lookup, supabase)

  const storyboardImages = await Promise.all(
    (scene.storyboardImages ?? []).map((img) => refreshStoryboardImage(img, supabase))
  )

  if (!assetPath && storyboardImages.length > 0) {
    const active =
      storyboardImages.find((img) => img.id === scene.activeStoryboardId) ??
      storyboardImages[0]
    assetPath = active?.assetPath ?? null
  }

  if (!assetPath) {
    return storyboardImages.length
      ? { ...scene, storyboardImages }
      : scene
  }

  const imageUrl = (await refreshStoryboardUrl(assetPath, supabase)) ?? scene.imageUrl
  const active =
    storyboardImages.find((img) => img.id === scene.activeStoryboardId) ??
    storyboardImages[0]
  const nextActiveUrl = active?.url ?? imageUrl

  return {
    ...scene,
    imageAssetPath: assetPath,
    storyboardImages: storyboardImages.length ? storyboardImages : scene.storyboardImages,
    imageUrl: nextActiveUrl ?? imageUrl,
  }
}

export async function refreshAllSceneStoryboardUrls(
  scenes: CinematicScene[],
  opts?: { lookup?: LegacyAssetLookup; supabase?: SupabaseClient }
): Promise<CinematicScene[]> {
  const supabase = opts?.supabase ?? createSupabaseServerClient()
  const refreshed: CinematicScene[] = []
  for (let i = 0; i < scenes.length; i++) {
    refreshed.push(
      await refreshSceneStoryboardUrls(scenes[i], i, { ...opts, supabase })
    )
  }
  devLog('refresh.batch', {
    sceneCount: scenes.length,
    withPath: refreshed.filter((s) => s.imageAssetPath).length,
  })
  return refreshed
}

export function sceneStoryboardAsset(
  scene: CinematicScene
): StoryboardAsset | null {
  const assetPath = resolveScenePrimaryAssetPath(scene)
  if (!assetPath) return null
  return { assetPath, imageUrl: scene.imageUrl ?? undefined }
}
