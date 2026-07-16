import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { PROJECT_ASSETS_BUCKET, projectStoragePrefix } from '@/lib/storage/constants'
import {
  getSceneImageAsset,
  hardDeleteAssetRow,
  softDeleteAsset,
  type ProjectAssetRow,
} from '@/lib/storage/asset-repository.server'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'

export type DeleteStorageObjectResult = {
  deleted: boolean
  path: string
  bucket: string
  error?: string
}

/** Verify ownership before delete. */
export function verifyAssetOwnership(params: {
  asset: ProjectAssetRow
  userId: string
  projectId: string
}): boolean {
  return (
    params.asset.user_id === params.userId &&
    params.asset.project_id === params.projectId &&
    Boolean(params.asset.storage_path?.trim())
  )
}

export async function deleteStorageObject(params: {
  bucket: string
  storagePath: string
  userId: string
  projectId: string
  supabase?: SupabaseClient
}): Promise<DeleteStorageObjectResult> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const path = params.storagePath.trim()
  const prefix = projectStoragePrefix(params.userId, params.projectId)

  if (!path.startsWith(prefix) && !path.startsWith(`${params.userId}/`)) {
    return {
      deleted: false,
      path,
      bucket: params.bucket,
      error: 'storage_path does not belong to project owner',
    }
  }

  const { error } = await supabase.storage.from(params.bucket).remove([path])
  if (error) {
    return { deleted: false, path, bucket: params.bucket, error: error.message }
  }
  return { deleted: true, path, bucket: params.bucket }
}

export type ReplaceSceneAssetResult = {
  sceneId: string
  oldAssetId: string | null
  newAssetId: string
  deletedStorageObject: boolean
  deletedDatabaseRow: boolean
}

export function logSceneAssetReplaced(entry: ReplaceSceneAssetResult): void {
  console.info('[SCENE_ASSET_REPLACED]', JSON.stringify(entry))
}

/** Soft-delete old row, delete storage object, then caller uploads + creates new row. */
export async function deletePreviousSceneAsset(params: {
  userId: string
  projectId: string
  sceneId: string
  previousAssetId?: string | null
  supabase?: SupabaseClient
}): Promise<{
  oldAssetId: string | null
  deletedStorageObject: boolean
  deletedDatabaseRow: boolean
}> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const previous =
    params.previousAssetId?.trim()
      ? await getSceneImageAsset({
          projectId: params.projectId,
          sceneId: params.sceneId,
          assetId: params.previousAssetId,
          supabase,
        })
      : await getSceneImageAsset({
          projectId: params.projectId,
          sceneId: params.sceneId,
          supabase,
        })

  if (!previous) {
    return { oldAssetId: null, deletedStorageObject: false, deletedDatabaseRow: false }
  }

  if (!verifyAssetOwnership({ asset: previous, userId: params.userId, projectId: params.projectId })) {
    throw new Error(`Asset ${previous.id} failed ownership verification`)
  }

  const softDeleted = await softDeleteAsset(previous.id, supabase)
  if (!softDeleted) {
    throw new Error(`Failed to soft-delete asset ${previous.id}`)
  }

  let deletedStorageObject = false
  const bucket = previous.bucket?.trim() || PROJECT_ASSETS_BUCKET
  const storagePath = previous.storage_path?.trim()

  if (storagePath) {
    const removal = await deleteStorageObject({
      bucket,
      storagePath,
      userId: params.userId,
      projectId: params.projectId,
      supabase,
    })
    deletedStorageObject = removal.deleted
    if (!removal.deleted && removal.error) {
      // Rollback soft-delete
      await supabase
        .from('project_assets')
        .update({ deleted_at: null })
        .eq('id', previous.id)
      throw new Error(`Storage delete failed — rolled back DB soft-delete: ${removal.error}`)
    }
    await hardDeleteAssetRow(previous.id, supabase)
  } else {
    await hardDeleteAssetRow(previous.id, supabase)
  }

  return {
    oldAssetId: previous.id,
    deletedStorageObject,
    deletedDatabaseRow: true,
  }
}

export type ProjectStorageDeleteResult = {
  projectId: string
  filesDeleted: number
  rowsDeleted: number
  errors: string[]
}

export function logProjectStorageDelete(entry: ProjectStorageDeleteResult): void {
  console.info('[PROJECT_STORAGE_DELETE]', JSON.stringify(entry))
}

/** Delete all project assets from storage + DB. */
export async function deleteAllProjectAssets(params: {
  userId: string
  projectId: string
  supabase?: SupabaseClient
}): Promise<ProjectStorageDeleteResult> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const result: ProjectStorageDeleteResult = {
    projectId: params.projectId,
    filesDeleted: 0,
    rowsDeleted: 0,
    errors: [],
  }

  const { data: rows } = await supabase
    .from('project_assets')
    .select('id, storage_path, bucket, user_id, project_id')
    .eq('project_id', params.projectId)
    .eq('user_id', params.userId)

  const paths = new Set<string>()
  for (const row of rows ?? []) {
    const path = row.storage_path?.trim()
    if (path) paths.add(path)
    await softDeleteAsset(row.id, supabase)
    const bucket = row.bucket?.trim() || PROJECT_ASSETS_BUCKET
    if (path) {
      const removal = await deleteStorageObject({
        bucket,
        storagePath: path,
        userId: params.userId,
        projectId: params.projectId,
        supabase,
      })
      if (removal.deleted) result.filesDeleted += 1
      else if (removal.error) result.errors.push(removal.error)
    }
    if (await hardDeleteAssetRow(row.id, supabase)) result.rowsDeleted += 1
  }

  // Sweep storage prefix folders
  const prefixes = [
    `${params.userId}/${params.projectId}`,
    `${params.projectId}`,
  ]
  for (const prefix of prefixes) {
    await removeStoragePrefix(supabase, PROJECT_ASSETS_BUCKET, prefix, result)
  }

  logProjectStorageDelete(result)
  return result
}

async function removeStoragePrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
  result: ProjectStorageDeleteResult
): Promise<void> {
  const folder = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : ''
  const search = prefix.includes('/') ? prefix.slice(prefix.lastIndexOf('/') + 1) : prefix

  const { data, error } = await supabase.storage.from(bucket).list(folder || '', {
    limit: 500,
    search,
  })
  if (error) {
    result.errors.push(error.message)
    return
  }

  const toRemove: string[] = []
  for (const item of data ?? []) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name
    if (fullPath.startsWith(prefix) || fullPath.includes(prefix)) {
      toRemove.push(fullPath)
    }
  }

  if (toRemove.length) {
    const { error: rmErr } = await supabase.storage.from(bucket).remove(toRemove)
    if (rmErr) result.errors.push(rmErr.message)
    else result.filesDeleted += toRemove.length
  }
}
