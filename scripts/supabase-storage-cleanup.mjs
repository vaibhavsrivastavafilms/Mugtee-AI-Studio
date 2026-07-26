/**
 * List / purge regenerable Supabase Storage objects to recover free-plan quota.
 *
 * Usage:
 *   node scripts/supabase-storage-cleanup.mjs           # dry-run inventory
 *   node scripts/supabase-storage-cleanup.mjs --delete  # delete listed objects
 *
 * Loads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const doDelete = process.argv.includes('--delete')

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Buckets that hold regenerable media (safe to clear for quota recovery). */
const PURGE_BUCKETS = ['reels', 'project-assets', 'media', 'storyboards', 'exports', 'renders']

async function listAll(bucket, prefix = '') {
  const out = []
  let offset = 0
  const limit = 100
  for (;;) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data?.length) break

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      const isFolder = !entry.id && !entry.metadata
      if (isFolder || (entry.metadata == null && entry.id == null)) {
        // Heuristic: folders often lack id; recurse
        if (!entry.metadata?.size && !entry.id) {
          try {
            const nested = await listAll(bucket, path)
            out.push(...nested)
            continue
          } catch {
            /* treat as file */
          }
        }
      }
      out.push({
        bucket,
        path,
        size: Number(entry.metadata?.size ?? 0),
        updatedAt: entry.updated_at ?? entry.created_at ?? null,
      })
    }

    if (data.length < limit) break
    offset += limit
  }
  return out
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

async function main() {
  console.log(`Supabase: ${url}`)
  console.log(`Mode: ${doDelete ? 'DELETE' : 'DRY-RUN (pass --delete to purge)'}`)

  const { data: buckets, error: bucketErr } = await sb.storage.listBuckets()
  if (bucketErr) {
    console.error('listBuckets failed:', bucketErr.message)
    console.error(
      'If you see 402 / restricted, open Supabase Dashboard → Storage and delete files manually, or temporarily upgrade.'
    )
    process.exit(1)
  }

  console.log(
    '\nBuckets:',
    buckets.map((b) => b.name).join(', ') || '(none)'
  )

  const targets = buckets.filter((b) =>
    PURGE_BUCKETS.includes(b.name) || PURGE_BUCKETS.includes(b.id)
  )

  if (!targets.length) {
    console.log('\nNo known regenerable buckets found among:', PURGE_BUCKETS.join(', '))
    console.log('Listing all buckets for manual review…')
  }

  const scan = targets.length ? targets : buckets
  let totalBytes = 0
  const allFiles = []

  for (const bucket of scan) {
    try {
      const files = await listAll(bucket.name)
      const bytes = files.reduce((s, f) => s + f.size, 0)
      totalBytes += bytes
      allFiles.push(...files)
      console.log(`\n[${bucket.name}] ${files.length} objects · ${formatBytes(bytes)}`)
      files
        .slice()
        .sort((a, b) => b.size - a.size)
        .slice(0, 15)
        .forEach((f) => console.log(`  ${formatBytes(f.size).padStart(10)}  ${f.path}`))
      if (files.length > 15) console.log(`  … +${files.length - 15} more`)
    } catch (e) {
      console.error(`[${bucket.name}] list failed:`, e.message || e)
    }
  }

  console.log(`\nTotal listed: ${allFiles.length} objects · ${formatBytes(totalBytes)}`)

  if (!doDelete) {
    console.log('\nDry-run only. Re-run with --delete to remove regenerable media buckets:')
    console.log('  node scripts/supabase-storage-cleanup.mjs --delete')
    return
  }

  const purgeNames = new Set(
    (targets.length ? targets : buckets.filter((b) => PURGE_BUCKETS.includes(b.name))).map(
      (b) => b.name
    )
  )
  const toDelete = allFiles.filter((f) => purgeNames.has(f.bucket))
  if (!toDelete.length) {
    console.log('Nothing to delete.')
    return
  }

  console.log(`\nDeleting ${toDelete.length} objects…`)
  const byBucket = new Map()
  for (const f of toDelete) {
    if (!byBucket.has(f.bucket)) byBucket.set(f.bucket, [])
    byBucket.get(f.bucket).push(f.path)
  }

  let deleted = 0
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await sb.storage.from(bucket).remove(chunk)
      if (error) {
        console.error(`Delete failed in ${bucket}:`, error.message)
      } else {
        deleted += chunk.length
        console.log(`  ${bucket}: removed ${chunk.length}`)
      }
    }
  }

  console.log(`\nDone. Deleted ${deleted} objects.`)
  console.log('Wait a few minutes, then refresh Supabase Usage — Storage should drop under 1 GB.')
  console.log('Then retry /auth/login (health should return 200).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
