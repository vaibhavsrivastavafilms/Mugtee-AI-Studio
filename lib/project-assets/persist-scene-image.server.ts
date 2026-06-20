import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { logStoryboardFrame } from '@/lib/cinematic/generation-logger'
import type { ImageUploadTraceSession } from '@/lib/export/image-upload-trace.server'

export type PersistSceneImageAssetInput = {
  userId: string
  projectId: string
  url: string
  storagePath?: string | null
  prompt?: string | null
  title?: string | null
  sceneId?: string | null
  sequenceIndex?: number | null
  metadata?: Record<string, unknown>
  supabase?: SupabaseClient
  trace?: ImageUploadTraceSession
}

/** Insert a storyboard still into project_assets (kind=image) for export/library tracking. */
export async function persistSceneImageAsset(
  input: PersistSceneImageAssetInput
): Promise<{ id: string; url: string } | null> {
  const url = input.url?.trim()
  const projectId = input.projectId?.trim()
  const userId = input.userId?.trim()
  if (!url || !projectId || !userId) return null
  if (url.startsWith('data:image/svg')) return null

  const supabase = input.supabase ?? createSupabaseServerClient()
  const storagePathFromUrl = extractStoragePathFromUrl(url)
  const storagePath = input.storagePath?.trim() || storagePathFromUrl || null
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    ...(input.sceneId ? { scene_id: input.sceneId } : {}),
    ...(input.sequenceIndex != null ? { sequence_index: input.sequenceIndex } : {}),
    source: input.metadata?.source ?? 'storyboard',
  }

  const { data, error } = await supabase
    .from('project_assets')
    .insert({
      project_id: projectId,
      user_id: userId,
      kind: 'image',
      url,
      storage_path:
        input.storagePath?.trim() || extractStoragePathFromUrl(url) || null,
      mime_type: 'image/png',
      title: input.title?.trim() || null,
      prompt: input.prompt?.trim() || null,
      metadata,
    })
    .select('id, url')
    .single()

  if (error) {
    console.warn('[project_assets] image insert failed', {
      projectId,
      sceneId: input.sceneId,
      message: error.message,
    })
    input.trace?.recordStorageResponse('dbInsert', {
      ok: false,
      path: `project_assets:${input.sceneId ?? 'unknown'}`,
      error,
      detail: 'project_assets insert failed',
    })
    logStoryboardFrame(projectId, {
      frameId: input.sceneId ?? 'unknown',
      imageUrl: url,
      storagePath: input.storagePath?.trim() || extractStoragePathFromUrl(url) || null,
      persisted: false,
    })
    return null
  }

  input.trace?.recordStorageResponse('dbInsert', {
    ok: true,
    path: `project_assets:${data?.id ?? input.sceneId ?? 'unknown'}`,
    detail: `storage_path=${storagePath ?? 'null'}`,
  })
  if (input.trace) {
    input.trace.dbUpdated = Boolean(data?.id)
    input.trace.thumbnailUrl = data?.url ?? url
    if (storagePath && !input.trace.storagePath) {
      input.trace.storagePath = storagePath
    }
  }

  logStoryboardFrame(projectId, {
    frameId: input.sceneId ?? data?.id ?? 'unknown',
    imageUrl: data?.url ?? url,
    storagePath,
    persisted: Boolean(data?.id),
  })

  return data ? { id: data.id, url: data.url } : null
}

/** Backfill project_assets from persisted scene JSON (legacy projects). */
export async function backfillProjectAssetsFromScenes(params: {
  userId: string
  projectId: string
  scenes: Array<{
    id: string
    title?: string | null
    imageUrl?: string | null
    imagePrompt?: string | null
    storyboardImages?: Array<{ id?: string; url?: string | null }> | null
    activeStoryboardId?: string | null
  }>
  existingSceneIds?: Set<string>
}): Promise<number> {
  const seen = params.existingSceneIds ?? new Set<string>()
  let count = 0
  for (let i = 0; i < params.scenes.length; i++) {
    const scene = params.scenes[i]
    if (seen.has(scene.id)) continue
    const active = scene.storyboardImages?.find(
      (img) => img.id === scene.activeStoryboardId
    )?.url
    const url =
      scene.imageUrl?.trim() ||
      active?.trim() ||
      scene.storyboardImages?.[0]?.url?.trim() ||
      null
    if (!url || url.startsWith('data:image/svg')) continue
    const row = await persistSceneImageAsset({
      userId: params.userId,
      projectId: params.projectId,
      url,
      prompt: scene.imagePrompt ?? null,
      title: scene.title ?? null,
      sceneId: scene.id,
      sequenceIndex: i + 1,
      metadata: { source: 'legacy-backfill' },
    })
    if (row) {
      seen.add(scene.id)
      count += 1
    }
  }
  return count
}

export async function persistGeneratedSceneImages(params: {
  userId: string
  projectId: string
  scenes: Array<{
    id: string
    imageUrl?: string | null
    imageAssetPath?: string | null
    imagePrompt?: string | null
    title?: string | null
  }>
  sequenceOffset?: number
  source?: string
}): Promise<number> {
  let count = 0
  for (let i = 0; i < params.scenes.length; i++) {
    const scene = params.scenes[i]
    const imageUrl = scene.imageUrl?.trim()
    if (!imageUrl) continue
    const row = await persistSceneImageAsset({
      userId: params.userId,
      projectId: params.projectId,
      url: imageUrl,
      storagePath: scene.imageAssetPath?.trim() || undefined,
      prompt: scene.imagePrompt ?? null,
      title: scene.title ?? null,
      sceneId: scene.id,
      sequenceIndex: (params.sequenceOffset ?? 0) + i + 1,
      metadata: { source: params.source ?? 'generate-images' },
    })
    if (row) count += 1
  }
  return count
}
