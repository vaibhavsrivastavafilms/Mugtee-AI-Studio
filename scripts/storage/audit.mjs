#!/usr/bin/env node
/**
 * Storage audit report.
 * Usage: npm run storage:audit
 */
import fs from 'node:fs'
import path from 'node:path'
import { getServiceClient, BUCKET, listAllObjects, loadActiveAssets, formatBytes } from './_shared.mjs'

const supabase = getServiceClient()
const assets = await loadActiveAssets(supabase)
const objects = await listAllObjects(supabase, BUCKET)
const dbPaths = new Set(assets.map((a) => a.storage_path?.trim()).filter(Boolean))
const storagePaths = new Set(objects.map((o) => o.path))

let orphans = 0
let storageUsedBytes = 0
for (const obj of objects) {
  storageUsedBytes += obj.size
  if (!dbPaths.has(obj.path)) orphans += 1
}

let missingFiles = 0
for (const asset of assets) {
  const p = asset.storage_path?.trim()
  if (p && !storagePaths.has(p)) missingFiles += 1
}

const shaGroups = new Map()
for (const asset of assets) {
  if (!asset.sha256 || !asset.scene_id) continue
  const key = `${asset.project_id}:${asset.scene_id}:${asset.sha256}`
  const g = shaGroups.get(key) ?? []
  g.push(asset)
  shaGroups.set(key, g)
}
let duplicateFiles = 0
for (const g of shaGroups.values()) {
  if (g.length > 1) duplicateFiles += g.length - 1
}

const projectMap = new Map()
for (const asset of assets) {
  const cur = projectMap.get(asset.project_id) ?? { bytes: 0, count: 0 }
  cur.bytes += asset.file_size ?? 0
  cur.count += 1
  projectMap.set(asset.project_id, cur)
}

const largestProjects = [...projectMap.entries()]
  .map(([projectId, v]) => ({ projectId, bytes: v.bytes, assetCount: v.count }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 10)

const potentialSavingsBytes = objects
  .filter((o) => !dbPaths.has(o.path))
  .reduce((s, o) => s + o.size, 0)

const report = {
  at: new Date().toISOString(),
  projects: projectMap.size,
  assets: assets.length,
  orphans,
  duplicateFiles,
  missingFiles,
  storageUsedBytes,
  storageUsedHuman: formatBytes(storageUsedBytes),
  potentialSavingsBytes,
  potentialSavingsHuman: formatBytes(potentialSavingsBytes),
  largestProjects,
}

const outPath = path.join(process.cwd(), 'docs', 'STORAGE_AUDIT_REPORT.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log('Projects:', report.projects)
console.log('Assets:', report.assets)
console.log('Orphans:', report.orphans)
console.log('Duplicate Files:', report.duplicateFiles)
console.log('Missing Files:', report.missingFiles)
console.log('Storage Used:', report.storageUsedHuman)
console.log('Potential Savings:', report.potentialSavingsHuman)
console.log('Largest Projects:', largestProjects.slice(0, 5))
console.log('')
console.log('Full report:', outPath)
