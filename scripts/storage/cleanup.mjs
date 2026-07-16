#!/usr/bin/env node
/**
 * Orphan cleanup — storage objects without DB rows, DB rows without storage objects.
 * Usage: npm run storage:cleanup
 */
import { getServiceClient, BUCKET, listAllObjects, loadActiveAssets, formatBytes } from './_shared.mjs'

const supabase = getServiceClient()
const result = {
  storageObjectsScanned: 0,
  deletedFromStorage: 0,
  deletedFromDb: 0,
  recovered: 0,
  errors: [],
}

console.log('[storage:cleanup] Starting orphan cleanup…')

const assets = await loadActiveAssets(supabase)
const dbPaths = new Set(assets.map((a) => a.storage_path?.trim()).filter(Boolean))
const objects = await listAllObjects(supabase, BUCKET)
result.storageObjectsScanned = objects.length

for (const obj of objects) {
  if (!dbPaths.has(obj.path)) {
    const { error } = await supabase.storage.from(BUCKET).remove([obj.path])
    if (error) result.errors.push(`${obj.path}: ${error.message}`)
    else {
      result.deletedFromStorage += 1
      result.recovered += obj.size
    }
  }
}

const objectSet = new Set(objects.map((o) => o.path))
for (const asset of assets) {
  const path = asset.storage_path?.trim()
  if (!path) continue
  if (!objectSet.has(path)) {
    const { error } = await supabase.from('project_assets').delete().eq('id', asset.id)
    if (error) result.errors.push(`db:${asset.id}: ${error.message}`)
    else result.deletedFromDb += 1
  }
}

console.log('')
console.log('Storage objects scanned:', result.storageObjectsScanned)
console.log('Deleted (orphan storage):', result.deletedFromStorage, `(${formatBytes(result.recovered)} recovered)`)
console.log('Deleted (stale DB rows):', result.deletedFromDb)
console.log('Errors:', result.errors.length)
if (result.errors.length) console.log(result.errors.slice(0, 20))

process.exit(result.errors.length ? 1 : 0)
