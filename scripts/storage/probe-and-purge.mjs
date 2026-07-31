/**
 * Fresh-start cleanup: empty regenerable Storage buckets.
 * Keeps auth users, profiles, projects, subscriptions, payments (DB only).
 *
 *   node scripts/storage/probe-and-purge.mjs
 *   node scripts/storage/probe-and-purge.mjs --dry-run
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

/** Regenerable media — safe to wipe for a fresh start. */
const SAFE = new Set([
  'reels',
  'project-assets',
  'media',
  'storyboards',
  'exports',
  'renders',
  'temporary',
  'cache',
  'preview',
  'thumbnails',
  'generated-images',
  'voiceovers',
  'music',
  'uploads',
])

/** Keep these buckets if present (brand / account assets). */
const KEEP = new Set(['avatars', 'brand-assets', 'profiles'])

const dryRun = process.argv.includes('--dry-run')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

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
    if (dryRun) {
      console.log(`  [dry-run] ${name}: would remove ${paths.length}`)
      return paths.length
    }
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

async function softClearProjectAssets() {
  // Soft-delete regenerable asset rows; do not touch projects / users.
  if (dryRun) {
    const { count, error } = await sb
      .from('project_assets')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
    if (error) {
      console.log('project_assets probe:', error.message)
      return 0
    }
    console.log(`[dry-run] project_assets active rows: ${count ?? 0}`)
    return count ?? 0
  }

  const { data, error } = await sb
    .from('project_assets')
    .update({ deleted_at: new Date().toISOString() })
    .is('deleted_at', null)
    .select('id')

  if (error) {
    // Table may not have deleted_at — try hard delete of asset metadata only.
    console.log('soft-delete project_assets failed:', error.message)
    const del = await sb.from('project_assets').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id')
    if (del.error) {
      console.log('hard-delete project_assets skipped:', del.error.message)
      return 0
    }
    console.log(`Deleted ${del.data?.length ?? 0} project_assets rows`)
    return del.data?.length ?? 0
  }

  console.log(`Soft-deleted ${data?.length ?? 0} project_assets rows`)
  return data?.length ?? 0
}

async function main() {
  console.log('=== Mugtee fresh-start cleanup ===')
  console.log('Keeps: auth.users, profiles, projects, subscriptions, payments')
  console.log('Purges: regenerable Storage + project_assets metadata')
  if (dryRun) console.log('MODE: dry-run\n')

  console.log('Probing auth/v1/health…')
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || key
  const health = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  const healthBody = await health.text()
  console.log(`  status ${health.status}: ${healthBody.slice(0, 180)}`)

  console.log('Probing Storage listBuckets…')
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) {
    console.error('\nStorage API blocked:', error.message)
    console.error(`
Cannot purge via API while exceed_storage_size_quota is active.

Do this now (Dashboard still works while restricted):
1. https://supabase.com/dashboard/project → Storage
2. Empty: reels, project-assets, media (+ any large buckets)
3. Leave DB alone (users/projects)
4. Wait until Usage Storage < 1 GB, then re-run:
   npm run storage:purge-safe

Or temporarily upgrade Free → Pro, then:
   npm run storage:purge-safe
`)
    process.exit(1)
  }

  const names = (buckets ?? []).map((b) => b.name)
  console.log('Buckets:', names.join(', ') || '(none)')

  const targets = names.filter((n) => SAFE.has(n) && !KEEP.has(n))
  const skipped = names.filter((n) => !SAFE.has(n) || KEEP.has(n))
  console.log('Will empty:', targets.join(', ') || '(none)')
  if (skipped.length) console.log('Skip (keep):', skipped.join(', '))

  let deleted = 0
  for (const name of targets) {
    console.log(`Emptying ${name}…`)
    deleted += await emptyBucket(name)
  }

  console.log('\nClearing project_assets metadata…')
  await softClearProjectAssets()

  console.log(`\nDone. Removed ${deleted} storage objects${dryRun ? ' (dry-run)' : ''}.`)
  console.log('Refresh Usage → Storage should drop under 1 GB within minutes.')
  console.log('Re-check: GET /auth/v1/health → expect 200 after restriction clears.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
