/**
 * Purge regenerable (then all) Storage objects via Storage API.
 * Use AFTER Supabase lifts the 402 restriction OR after a temporary plan upgrade.
 *
 *   node scripts/storage/purge-all-via-api.mjs
 *   node scripts/storage/purge-all-via-api.mjs --all
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnvLocal()

const SAFE = [
  'reels',
  'project-assets',
  'media',
  'storyboards',
  'exports',
  'renders',
  'temporary',
  'cache',
  'thumbnails',
  'generated-images',
  'voiceovers',
  'music',
  'uploads',
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const purgeAll = process.argv.includes('--all')

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function listRecursive(bucket, prefix = '') {
  const out = []
  const { data, error } = await sb.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) throw error
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id) out.push(path)
    else out.push(...(await listRecursive(bucket, path)))
  }
  return out
}

async function emptyBucket(name) {
  let total = 0
  for (;;) {
    const paths = await listRecursive(name)
    if (!paths.length) break
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await sb.storage.from(name).remove(chunk)
      if (error) throw error
      total += chunk.length
      console.log(`  ${name}: removed ${chunk.length} (total ${total})`)
    }
  }
  return total
}

async function main() {
  console.log('Probing Storage API…')
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) {
    console.error('Storage API still blocked:', error.message)
    console.error(`
Recovery options (SQL cannot delete — protect_delete + not table owner):

1) RECOMMENDED — Dashboard UI
   Supabase → Storage → open each bucket → select all → Delete
   Focus: reels, project-assets, media

2) Temporary upgrade
   Upgrade Free → Pro (or remove spend cap), wait until Usage unlocks,
   then re-run: node scripts/storage/purge-all-via-api.mjs --all

3) Supabase Support
   Ask them to clear storage or lift exceed_storage_size_quota
`)
    process.exit(1)
  }

  const names = (buckets ?? []).map((b) => b.name)
  console.log('Buckets:', names.join(', ') || '(none)')

  const targets = purgeAll
    ? names
    : names.filter((n) => SAFE.includes(n))

  if (!targets.length) {
    console.log('No matching buckets. Use --all to purge every bucket.')
    process.exit(0)
  }

  let deleted = 0
  for (const name of targets) {
    console.log(`Emptying ${name}…`)
    deleted += await emptyBucket(name)
  }

  console.log(`\nDone. Removed ${deleted} objects.`)
  console.log('Refresh Usage → Storage should drop under 1 GB within minutes.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
