/**
 * Shared Supabase client + helpers for storage CLI scripts.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { loadEnvLocal } from '../ci/auth-session.mjs'

loadEnvLocal()

const BUCKET = 'project-assets'

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export { BUCKET }

export function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function listAllObjects(supabase, bucket, prefix = '') {
  const out = []
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 })
  if (error || !data) return out
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id) {
      out.push({ path, size: item.metadata?.size ?? 0 })
    } else {
      out.push(...(await listAllObjects(supabase, bucket, path)))
    }
  }
  return out
}

export async function loadActiveAssets(supabase) {
  const { data, error } = await supabase
    .from('project_assets')
    .select('*')
    .is('deleted_at', null)
    .not('storage_path', 'is', null)
  if (error) throw error
  return data ?? []
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
