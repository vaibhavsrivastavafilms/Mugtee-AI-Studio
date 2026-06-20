import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { PROJECT_ASSETS_BUCKET } from '@/lib/storage/constants'
import { listActiveAssets, hardDeleteAssetRow, type ProjectAssetRow } from '@/lib/storage/asset-repository.server'
import { deleteStorageObject } from '@/lib/storage/scene-asset-lifecycle.server'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'
import { storyboardStorageExists } from '@/lib/storyboard/storyboard-url-service.server'

export type OrphanCleanupResult = {
  storageObjectsScanned: number
  deletedFromStorage: number
  deletedFromDb: number
  recovered: number
  errors: string[]
}

export type StorageAuditReport = {
  projects: number
  assets: number
  orphans: number
  duplicateFiles: number
  missingFiles: number
  storageUsedBytes: number
  potentialSavingsBytes: number
  largestProjects: Array<{ projectId: string; bytes: number; assetCount: number }>
}

async function listAllStorageObjects(
  supabase: SupabaseClient,
  bucket: string
): Promise<Array<{ path: string; size: number }>> {
  const objects: Array<{ path: string; size: number }> = []

  async function walk(prefix: string): Promise<void> {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 })
    if (error || !data) return

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) {
        objects.push({ path, size: (item.metadata as { size?: number })?.size ?? 0 })
      } else {
        await walk(path)
      }
    }
  }

  await walk('')
  return objects
}

export async function runOrphanCleanup(supabase?: SupabaseClient): Promise<OrphanCleanupResult> {
  const client = supabase ?? requireSupabaseServiceClient()
  const result: OrphanCleanupResult = {
    storageObjectsScanned: 0,
    deletedFromStorage: 0,
    deletedFromDb: 0,
    recovered: 0,
    errors: [],
  }

  const dbAssets = await listActiveAssets(client)
  const dbPathSet = new Set(
    dbAssets.map((a) => a.storage_path?.trim()).filter(Boolean) as string[]
  )

  const storageObjects = await listAllStorageObjects(client, PROJECT_ASSETS_BUCKET)
  result.storageObjectsScanned = storageObjects.length

  for (const obj of storageObjects) {
    if (!dbPathSet.has(obj.path)) {
      const { error } = await client.storage.from(PROJECT_ASSETS_BUCKET).remove([obj.path])
      if (error) result.errors.push(`storage:${obj.path}:${error.message}`)
      else {
        result.deletedFromStorage += 1
        result.recovered += obj.size
      }
    }
  }

  for (const asset of dbAssets) {
    const path = asset.storage_path?.trim()
    if (!path) continue
    const exists = await storyboardStorageExists(path, client)
    if (!exists) {
      await hardDeleteAssetRow(asset.id, client)
      result.deletedFromDb += 1
    }
  }

  return result
}

export async function runStorageAudit(supabase?: SupabaseClient): Promise<StorageAuditReport> {
  const client = supabase ?? requireSupabaseServiceClient()
  const dbAssets = await listActiveAssets(client)
  const storageObjects = await listAllStorageObjects(client, PROJECT_ASSETS_BUCKET)
  const dbPathSet = new Set(
    dbAssets.map((a) => a.storage_path?.trim()).filter(Boolean) as string[]
  )
  const storagePathSet = new Set(storageObjects.map((o) => o.path))

  let orphans = 0
  let storageUsedBytes = 0
  for (const obj of storageObjects) {
    storageUsedBytes += obj.size
    if (!dbPathSet.has(obj.path)) orphans += 1
  }

  let missingFiles = 0
  for (const asset of dbAssets) {
    const path = asset.storage_path?.trim()
    if (path && !storagePathSet.has(path)) missingFiles += 1
  }

  const shaGroups = new Map<string, ProjectAssetRow[]>()
  for (const asset of dbAssets) {
    if (!asset.sha256 || !asset.scene_id) continue
    const key = `${asset.project_id}:${asset.scene_id}:${asset.sha256}`
    const group = shaGroups.get(key) ?? []
    group.push(asset)
    shaGroups.set(key, group)
  }
  let duplicateFiles = 0
  for (const group of shaGroups.values()) {
    if (group.length > 1) duplicateFiles += group.length - 1
  }

  const projectBytes = new Map<string, { bytes: number; count: number }>()
  for (const asset of dbAssets) {
    const size = asset.file_size ?? 0
    const cur = projectBytes.get(asset.project_id) ?? { bytes: 0, count: 0 }
    cur.bytes += size
    cur.count += 1
    projectBytes.set(asset.project_id, cur)
  }

  const largestProjects = [...projectBytes.entries()]
    .map(([projectId, v]) => ({ projectId, bytes: v.bytes, assetCount: v.count }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10)

  const potentialSavingsBytes = storageObjects
    .filter((o) => !dbPathSet.has(o.path))
    .reduce((sum, o) => sum + o.size, 0)

  return {
    projects: projectBytes.size,
    assets: dbAssets.length,
    orphans,
    duplicateFiles,
    missingFiles,
    storageUsedBytes,
    potentialSavingsBytes,
    largestProjects,
  }
}

export async function runStorageRecover(supabase?: SupabaseClient): Promise<{
  recoveredSpace: number
  deletedFiles: number
  deletedRows: number
  remainingStorage: number
  audit: StorageAuditReport
}> {
  const client = supabase ?? requireSupabaseServiceClient()
  const before = await runStorageAudit(client)
  const orphanResult = await runOrphanCleanup(client)

  let deletedRows = orphanResult.deletedFromDb
  let deletedFiles = orphanResult.deletedFromStorage

  const dbAssets = await listActiveAssets(client)
  const shaSeen = new Map<string, string>()
  for (const asset of dbAssets) {
    if (!asset.sha256 || !asset.scene_id) continue
    const key = `${asset.project_id}:${asset.scene_id}:${asset.sha256}`
    const keeper = shaSeen.get(key)
    if (keeper) {
      const path = asset.storage_path?.trim()
      if (path) {
        await deleteStorageObject({
          bucket: asset.bucket ?? PROJECT_ASSETS_BUCKET,
          storagePath: path,
          userId: asset.user_id,
          projectId: asset.project_id,
          supabase: client,
        })
        deletedFiles += 1
      }
      await hardDeleteAssetRow(asset.id, client)
      deletedRows += 1
    } else {
      shaSeen.set(key, asset.id)
    }
  }

  const softDeleted = await client
    .from('project_assets')
    .select('id, storage_path, bucket, user_id, project_id, file_size')
    .not('deleted_at', 'is', null)

  for (const row of softDeleted.data ?? []) {
    const path = row.storage_path?.trim()
    if (path) {
      await deleteStorageObject({
        bucket: row.bucket ?? PROJECT_ASSETS_BUCKET,
        storagePath: path,
        userId: row.user_id,
        projectId: row.project_id,
        supabase: client,
      })
      deletedFiles += 1
    }
    await hardDeleteAssetRow(row.id, client)
    deletedRows += 1
  }

  const after = await runStorageAudit(client)
  return {
    recoveredSpace: before.potentialSavingsBytes,
    deletedFiles,
    deletedRows,
    remainingStorage: after.storageUsedBytes,
    audit: after,
  }
}
