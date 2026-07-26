import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  FREE_PLAN_STORAGE_LIMIT_BYTES,
  SAFE_DELETE_BUCKETS,
  STORAGE_AUTO_CLEAN_RATIO,
  STORAGE_PAUSE_RENDERS_RATIO,
  STORAGE_WARN_RATIO,
} from '@/lib/storage/retention-policy'

export type StorageQuotaLevel = 'ok' | 'warn' | 'auto_clean' | 'pause_renders' | 'restricted'

export type StorageQuotaSnapshot = {
  level: StorageQuotaLevel
  usedBytes: number | null
  limitBytes: number
  usedRatio: number | null
  allowNewRenders: boolean
  shouldAutoCleanTemp: boolean
  shouldWarnAdmins: boolean
  /** Auth must never be blocked by app code — Supabase may still 402 until quota cleared. */
  preserveAuth: true
  detail: string
  restrictedByProvider: boolean
}

function levelFromRatio(ratio: number | null, restricted: boolean): StorageQuotaLevel {
  if (restricted) return 'restricted'
  if (ratio == null) return 'ok'
  if (ratio >= STORAGE_PAUSE_RENDERS_RATIO) return 'pause_renders'
  if (ratio >= STORAGE_AUTO_CLEAN_RATIO) return 'auto_clean'
  if (ratio >= STORAGE_WARN_RATIO) return 'warn'
  return 'ok'
}

/**
 * Probe storage health + approximate usage.
 * When Supabase returns 402, marks restricted and pauses new renders.
 */
export async function getStorageQuotaSnapshot(): Promise<StorageQuotaSnapshot> {
  const limitBytes = FREE_PLAN_STORAGE_LIMIT_BYTES
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    return {
      level: 'ok',
      usedBytes: null,
      limitBytes,
      usedRatio: null,
      allowNewRenders: true,
      shouldAutoCleanTemp: false,
      shouldWarnAdmins: false,
      preserveAuth: true,
      detail: 'Service role unavailable — quota probe skipped',
      restrictedByProvider: false,
    }
  }

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    const msg = listErr.message || ''
    const restricted =
      /exceed_storage_size_quota|service.*restricted|402|spend cap/i.test(msg)
    return {
      level: restricted ? 'restricted' : 'ok',
      usedBytes: null,
      limitBytes,
      usedRatio: restricted ? 1 : null,
      allowNewRenders: !restricted,
      shouldAutoCleanTemp: restricted,
      shouldWarnAdmins: restricted,
      preserveAuth: true,
      detail: restricted
        ? 'Supabase project restricted (storage quota). Clear storage via SQL Editor.'
        : `Storage probe failed: ${msg}`,
      restrictedByProvider: restricted,
    }
  }

  // Approximate usage from project_assets.file_size (DB still readable when Storage API works)
  let usedBytes: number | null = null
  try {
    const { data, error } = await supabase
      .from('project_assets')
      .select('file_size')
      .is('deleted_at', null)
      .not('file_size', 'is', null)
      .limit(5000)

    if (!error && data) {
      usedBytes = data.reduce((sum, row) => sum + Number(row.file_size ?? 0), 0)
    }
  } catch {
    usedBytes = null
  }

  // If DB estimate is thin, sample listed buckets for a lower bound
  if ((usedBytes == null || usedBytes === 0) && buckets?.length) {
    let sample = 0
    for (const bucket of buckets) {
      if (!(SAFE_DELETE_BUCKETS as readonly string[]).includes(bucket.name)) continue
      const { data } = await supabase.storage.from(bucket.name).list('', { limit: 100 })
      for (const item of data ?? []) {
        sample += Number(item.metadata?.size ?? 0)
      }
    }
    if (sample > 0) usedBytes = sample
  }

  const usedRatio = usedBytes != null ? usedBytes / limitBytes : null
  const level = levelFromRatio(usedRatio, false)

  return {
    level,
    usedBytes,
    limitBytes,
    usedRatio,
    allowNewRenders: level !== 'pause_renders' && level !== 'restricted',
    shouldAutoCleanTemp: level === 'auto_clean' || level === 'pause_renders',
    shouldWarnAdmins: level === 'warn' || level === 'auto_clean' || level === 'pause_renders',
    preserveAuth: true,
    detail:
      usedRatio != null
        ? `Storage ~${Math.round(usedRatio * 100)}% of free-plan limit`
        : `Buckets OK (${buckets?.length ?? 0}); usage estimate unavailable`,
    restrictedByProvider: false,
  }
}

/** Throw if new render/export uploads should be paused. */
export async function assertStorageAllowsRenders(): Promise<StorageQuotaSnapshot> {
  const snap = await getStorageQuotaSnapshot()
  if (!snap.allowNewRenders) {
    const err = new Error(
      snap.restrictedByProvider
        ? 'Storage quota exceeded on Supabase. Clear regenerable media via SQL Editor, then retry export.'
        : 'Storage is nearly full. New renders are paused until temporary assets are cleaned up.'
    )
    ;(err as Error & { code?: string }).code = 'STORAGE_QUOTA_PAUSE'
    throw err
  }
  if (snap.shouldWarnAdmins && process.env.NODE_ENV === 'development') {
    console.warn('[storage-quota]', snap.detail, {
      level: snap.level,
      usedBytes: snap.usedBytes,
    })
  }
  return snap
}
