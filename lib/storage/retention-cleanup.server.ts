import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  RETENTION_RULES,
  SAFE_DELETE_BUCKETS,
  type RetentionRule,
} from '@/lib/storage/retention-policy'

export type RetentionCleanupResult = {
  ok: boolean
  deletedObjects: number
  deletedAssetRows: number
  errors: string[]
  skipped: boolean
  detail: string
}

function matchesRule(path: string, rule: RetentionRule): boolean {
  if (!rule.pathIncludes.length) return true
  const lower = path.toLowerCase()
  return rule.pathIncludes.some((frag) => lower.includes(frag.toLowerCase()))
}

/**
 * Delete expired regenerable objects when Storage API is available.
 * No-op (skipped) when project is restricted — use SQL scripts instead.
 */
export async function runRetentionCleanup(options?: {
  dryRun?: boolean
  maxDeletes?: number
}): Promise<RetentionCleanupResult> {
  const dryRun = options?.dryRun ?? false
  const maxDeletes = options?.maxDeletes ?? 500
  const supabase = createSupabaseServiceClient()
  const errors: string[] = []

  if (!supabase) {
    return {
      ok: false,
      deletedObjects: 0,
      deletedAssetRows: 0,
      errors: ['Service role unavailable'],
      skipped: true,
      detail: 'No service client',
    }
  }

  const { error: probeErr } = await supabase.storage.listBuckets()
  if (probeErr) {
    return {
      ok: false,
      deletedObjects: 0,
      deletedAssetRows: 0,
      errors: [probeErr.message],
      skipped: true,
      detail:
        'Storage API unavailable (likely quota restriction). Run scripts/storage/sql/08_safe_delete_CONFIRM.sql',
    }
  }

  let deletedObjects = 0
  let deletedAssetRows = 0

  for (const bucket of SAFE_DELETE_BUCKETS) {
    if (deletedObjects >= maxDeletes) break

    const { data: entries, error } = await supabase.storage.from(bucket).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'asc' },
    })
    if (error) {
      // Bucket may not exist
      continue
    }

    const toRemove: string[] = []
    const now = Date.now()

    for (const entry of entries ?? []) {
      if (!entry.id) continue // folder
      const path = entry.name
      const created = entry.created_at ? Date.parse(entry.created_at) : NaN
      if (!Number.isFinite(created)) continue

      for (const rule of RETENTION_RULES) {
        if (!rule.buckets.includes(bucket)) continue
        if (!matchesRule(path, rule)) continue
        const ageMs = now - created
        const maxMs = rule.maxAgeDays * 24 * 60 * 60 * 1000
        if (ageMs >= maxMs) {
          toRemove.push(path)
          break
        }
      }
    }

    const chunk = toRemove.slice(0, maxDeletes - deletedObjects)
    if (!chunk.length) continue

    if (dryRun) {
      deletedObjects += chunk.length
      continue
    }

    const { error: rmErr } = await supabase.storage.from(bucket).remove(chunk)
    if (rmErr) errors.push(`${bucket}: ${rmErr.message}`)
    else deletedObjects += chunk.length
  }

  // Hard-delete soft-deleted asset rows + best-effort storage remove
  if (!dryRun) {
    const { data: soft, error: softErr } = await supabase
      .from('project_assets')
      .select('id, storage_path, bucket')
      .not('deleted_at', 'is', null)
      .limit(200)

    if (softErr) errors.push(softErr.message)
    else {
      for (const row of soft ?? []) {
        if (row.storage_path) {
          await supabase.storage
            .from(row.bucket || 'project-assets')
            .remove([row.storage_path])
        }
        const { error: delErr } = await supabase
          .from('project_assets')
          .delete()
          .eq('id', row.id)
        if (!delErr) deletedAssetRows += 1
      }
    }
  }

  return {
    ok: errors.length === 0,
    deletedObjects,
    deletedAssetRows,
    errors,
    skipped: false,
    detail: dryRun
      ? `Dry-run: would remove ~${deletedObjects} objects`
      : `Removed ${deletedObjects} objects, ${deletedAssetRows} asset rows`,
  }
}
