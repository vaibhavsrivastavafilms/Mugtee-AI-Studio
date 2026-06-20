import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { storyboardStoragePath } from '@/lib/storage/constants'
import {
  createSceneImageAsset,
  findDuplicateSceneAsset,
  type ProjectAssetRow,
} from '@/lib/storage/asset-repository.server'
import {
  deletePreviousSceneAsset,
  logSceneAssetReplaced,
} from '@/lib/storage/scene-asset-lifecycle.server'
import { createStoryboardSignedUrl } from '@/lib/storage/signed-url.server'
import { uploadStoryboardBuffer, sha256Buffer } from '@/lib/storage/storage-upload.server'
import { StorageUploadError } from '@/lib/storage/errors'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type PersistStoryboardImageInput = {
  userId: string
  projectId: string
  sceneId: string
  buffer: Buffer
  contentType?: string
  prompt?: string | null
  title?: string | null
  sequenceIndex?: number
  previousAssetId?: string | null
  metadata?: Record<string, unknown>
  supabase?: SupabaseClient
}

export type PersistStoryboardImageResult = {
  asset: ProjectAssetRow
  imageAssetId: string
  imageAssetPath: string
  imageUrl: string
  thumbnailUrl: string
  reusedExisting: boolean
}

export type SceneImageFields = Pick<
  GeneratedScene,
  'imageAssetId' | 'imageAssetPath' | 'imageUrl' | 'thumbnailUrl'
>

/** Upload → DB row → fresh signed URLs. Replaces previous scene asset when regenerating. */
export async function persistStoryboardImage(
  input: PersistStoryboardImageInput
): Promise<PersistStoryboardImageResult> {
  const supabase = input.supabase
  const sha256 = sha256Buffer(input.buffer)

  const duplicate = await findDuplicateSceneAsset({
    projectId: input.projectId,
    sceneId: input.sceneId,
    sha256,
    supabase,
  })

  if (duplicate?.storage_path) {
    const signedUrl = await createStoryboardSignedUrl(duplicate.storage_path, supabase)
    if (!signedUrl) {
      throw new StorageUploadError({
        message: 'Duplicate asset found but signed URL generation failed',
        bucket: duplicate.bucket ?? 'project-assets',
        path: duplicate.storage_path,
        bytes: input.buffer.length,
        sceneId: input.sceneId,
      })
    }
    return {
      asset: duplicate,
      imageAssetId: duplicate.id,
      imageAssetPath: duplicate.storage_path,
      imageUrl: signedUrl,
      thumbnailUrl: signedUrl,
      reusedExisting: true,
    }
  }

  const cleanup = await deletePreviousSceneAsset({
    userId: input.userId,
    projectId: input.projectId,
    sceneId: input.sceneId,
    previousAssetId: input.previousAssetId,
    supabase,
  })

  const upload = await uploadStoryboardBuffer({
    buffer: input.buffer,
    storagePath: storyboardStoragePath({
      userId: input.userId,
      projectId: input.projectId,
      sceneId: input.sceneId,
    }),
    contentType: input.contentType,
    sceneId: input.sceneId,
    supabase,
  })

  const asset = await createSceneImageAsset({
    userId: input.userId,
    projectId: input.projectId,
    sceneId: input.sceneId,
    storagePath: upload.storagePath,
    bucket: upload.bucket,
    sha256: upload.sha256,
    fileSize: upload.fileSize,
    mimeType: upload.mimeType,
    prompt: input.prompt,
    title: input.title,
    sequenceIndex: input.sequenceIndex,
    metadata: input.metadata,
    supabase,
  })

  const signedUrl = await createStoryboardSignedUrl(upload.storagePath, supabase)
  if (!signedUrl) {
    throw new StorageUploadError({
      message: 'Upload succeeded but signed URL generation failed',
      bucket: upload.bucket,
      path: upload.storagePath,
      bytes: upload.fileSize,
      sceneId: input.sceneId,
    })
  }

  if (cleanup.oldAssetId) {
    logSceneAssetReplaced({
      sceneId: input.sceneId,
      oldAssetId: cleanup.oldAssetId,
      newAssetId: asset.id,
      deletedStorageObject: cleanup.deletedStorageObject,
      deletedDatabaseRow: cleanup.deletedDatabaseRow,
    })
  }

  return {
    asset,
    imageAssetId: asset.id,
    imageAssetPath: upload.storagePath,
    imageUrl: signedUrl,
    thumbnailUrl: signedUrl,
    reusedExisting: false,
  }
}

export function applySceneImageFields(
  scene: GeneratedScene,
  result: PersistStoryboardImageResult
): GeneratedScene {
  return {
    ...scene,
    imageAssetId: result.imageAssetId,
    imageAssetPath: result.imageAssetPath,
    imageUrl: result.imageUrl,
    thumbnailUrl: result.thumbnailUrl,
  }
}

/** Download provider URL and persist durably — throws on failure. */
export async function persistRemoteStoryboardImage(params: {
  remoteUrl: string
  userId: string
  projectId: string
  sceneId: string
  prompt?: string | null
  title?: string | null
  sequenceIndex?: number
  previousAssetId?: string | null
  metadata?: Record<string, unknown>
  supabase?: SupabaseClient
}): Promise<PersistStoryboardImageResult> {
  const dataMatch = /^data:([^;]+);base64,(.+)$/i.exec(params.remoteUrl)
  if (dataMatch) {
    return persistStoryboardImage({
      userId: params.userId,
      projectId: params.projectId,
      sceneId: params.sceneId,
      buffer: Buffer.from(dataMatch[2], 'base64'),
      contentType: dataMatch[1],
      prompt: params.prompt,
      title: params.title,
      sequenceIndex: params.sequenceIndex,
      previousAssetId: params.previousAssetId,
      metadata: params.metadata,
      supabase: params.supabase,
    })
  }

  const isPollinations = /pollinations\.ai/i.test(params.remoteUrl)
  const imgRes = await fetch(params.remoteUrl, {
    signal: AbortSignal.timeout(isPollinations ? 60_000 : 30_000),
  })

  if (!imgRes.ok) {
    throw new StorageUploadError({
      message: `Provider image download failed: HTTP ${imgRes.status}`,
      bucket: 'project-assets',
      path: params.sceneId,
      bytes: 0,
      httpStatus: imgRes.status,
      sceneId: params.sceneId,
    })
  }

  const buffer = Buffer.from(await imgRes.arrayBuffer())
  return persistStoryboardImage({
    userId: params.userId,
    projectId: params.projectId,
    sceneId: params.sceneId,
    buffer,
    contentType: imgRes.headers.get('content-type') ?? 'image/png',
    prompt: params.prompt,
    title: params.title,
    sequenceIndex: params.sequenceIndex,
    previousAssetId: params.previousAssetId,
    metadata: params.metadata,
    supabase: params.supabase,
  })
}

export async function refreshSceneImageUrls(
  scene: Pick<GeneratedScene, 'imageAssetPath' | 'imageAssetId' | 'id'>,
  supabase?: SupabaseClient
): Promise<SceneImageFields | null> {
  const path = scene.imageAssetPath?.trim()
  if (!path) return null
  const signedUrl = await createStoryboardSignedUrl(path, supabase)
  if (!signedUrl) return null
  return {
    imageAssetId: scene.imageAssetId ?? undefined,
    imageAssetPath: path,
    imageUrl: signedUrl,
    thumbnailUrl: signedUrl,
  }
}
