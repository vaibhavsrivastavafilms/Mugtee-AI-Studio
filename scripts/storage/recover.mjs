#!/usr/bin/env node
/**
 * Quota recovery — orphans, soft-deleted rows, duplicate checksums.
 * Usage: npm run storage:recover
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { getServiceClient, BUCKET, listAllObjects, loadActiveAssets, formatBytes } from './_shared.mjs'

const supabase = getServiceClient()

console.log('[storage:recover] Pre-cleanup audit…')
const beforeObjects = await listAllObjects(supabase, BUCKET)
const beforeAssets = await loadActiveAssets(supabase)
const beforeBytes = beforeObjects.reduce((s, o) => s + o.size, 0)

execSync('node scripts/storage/cleanup.mjs', { stdio: 'inherit' })

let deletedRows = 0
let deletedFiles = 0

const { data: softDeleted } = await supabase
  .from('project_assets')
  .select('id, storage_path, bucket, user_id, project_id')
  .not('deleted_at', 'is', null)

for (const row of softDeleted ?? []) {
  const path = row.storage_path?.trim()
  if (path) {
    const { error } = await supabase.storage.from(row.bucket ?? BUCKET).remove([path])
    if (!error) deletedFiles += 1
  }
  await supabase.from('project_assets').delete().eq('id', row.id)
  deletedRows += 1
}

const assets = await loadActiveAssets(supabase)
const shaSeen = new Map()
for (const asset of assets) {
  if (!asset.sha256 || !asset.scene_id) continue
  const key = `${asset.project_id}:${asset.scene_id}:${asset.sha256}`
  if (shaSeen.has(key)) {
    const path = asset.storage_path?.trim()
    if (path) {
      await supabase.storage.from(asset.bucket ?? BUCKET).remove([path])
      deletedFiles += 1
    }
    await supabase.from('project_assets').delete().eq('id', asset.id)
    deletedRows += 1
  } else {
    shaSeen.set(key, asset.id)
  }
}

const afterObjects = await listAllObjects(supabase, BUCKET)
const afterBytes = afterObjects.reduce((s, o) => s + o.size, 0)
const recoveredSpace = Math.max(0, beforeBytes - afterBytes)

const report = {
  at: new Date().toISOString(),
  recoveredSpace,
  recoveredSpaceHuman: formatBytes(recoveredSpace),
  deletedFiles,
  deletedRows,
  remainingStorage: afterBytes,
  remainingStorageHuman: formatBytes(afterBytes),
  before: { objects: beforeObjects.length, assets: beforeAssets.length, bytes: beforeBytes },
  after: { objects: afterObjects.length, assets: (await loadActiveAssets(supabase)).length, bytes: afterBytes },
}

const outPath = path.join(process.cwd(), 'docs', 'STORAGE_RECOVER_REPORT.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log('')
console.log('Recovered Space:', report.recoveredSpaceHuman)
console.log('Deleted Files:', deletedFiles)
console.log('Deleted Rows:', deletedRows)
console.log('Remaining Storage:', report.remainingStorageHuman)
console.log('Report:', outPath)
