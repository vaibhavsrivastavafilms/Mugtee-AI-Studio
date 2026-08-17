import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { runExportInBackground } from '@/lib/export/export-background.server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import { advanceV7Production } from '@/lib/v7/orchestrator.server'
import {
  findGloballyLockedV7Production,
  findRunningStage,
  reconcilePipelineIntegrity,
  shouldDrivePipeline,
} from '@/lib/v7/pipeline-sync.server'

const DEFAULT_MAX_STAGES = 48
const DEFAULT_MAX_MS = 280_000
/** At most one production may execute provider work per worker tick. */
const CRON_PRODUCTION_LIMIT = 1
/**
 * Vercel cron route maxDuration is 300s; GitHub Actions job timeout is 6m.
 * Exit with a persisted checkpoint before the hard platform limit.
 */
const CRON_DRIVE_MAX_MS = 270_000
const CRON_CANDIDATE_LIMIT = 20

type CronProductionRow = { id: string; user_id: string }

/** Pick one production that can make progress — prefer newest after stale reconciliation. */
export async function pickProductionForCronTick(
  supabase: SupabaseServerClient
): Promise<CronProductionRow[]> {
  const { data, error } = await supabase
    .from('v7_productions')
    .select('id,user_id,updated_at')
    .in('status', ['producing', 'planning', 'failed'])
    .order('updated_at', { ascending: false })
    .limit(CRON_CANDIDATE_LIMIT)

  if (error) throw new Error(error.message)

  for (const row of data ?? []) {
    let snapshot = await getV7Production(supabase, row.id, row.user_id)
    if (!snapshot) continue

    snapshot =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId: row.id,
        userId: row.user_id,
        snapshot,
      })) ?? snapshot

    if (shouldDrivePipeline(snapshot)) {
      return [{ id: row.id, user_id: row.user_id }]
    }
  }

  return []
}

type DriveSupabase = SupabaseServerClient | SupabaseClient

/**
 * Advance one production through queued stages until blocked, failed, completed,
 * or limits are hit. Uses persisted checkpoints — safe to interrupt and resume.
 */
export async function runV7BackgroundDriveLoop(params: {
  supabase: DriveSupabase
  productionId: string
  userId: string
  maxStages?: number
  maxMs?: number
}): Promise<{ advanced: number; status: string | null }> {
  const maxStages = params.maxStages ?? DEFAULT_MAX_STAGES
  const deadline = Date.now() + (params.maxMs ?? DEFAULT_MAX_MS)
  let advanced = 0

  for (let i = 0; i < maxStages && Date.now() < deadline; i++) {
    let snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!snapshot) break

    snapshot =
      (await reconcilePipelineIntegrity({
        supabase: params.supabase as SupabaseServerClient,
        productionId: params.productionId,
        userId: params.userId,
        snapshot,
      })) ?? snapshot

    const status = snapshot.production.status
    if (status === 'completed' || status === 'failed') {
      return { advanced, status }
    }

    if (!shouldDrivePipeline(snapshot)) {
      if (findRunningStage(snapshot.stages)) {
        return { advanced, status: snapshot.production.status }
      }
      return { advanced, status: snapshot.production.status }
    }

    const otherExecution = await findGloballyLockedV7Production(
      params.supabase as SupabaseServerClient,
      params.productionId
    )
    if (otherExecution) {
      return { advanced, status: snapshot.production.status }
    }

    const completedBefore = snapshot.stages.filter((row) => row.status === 'completed').length

    try {
      const advanceResult = await advanceV7Production({
        supabase: params.supabase as SupabaseServerClient,
        productionId: params.productionId,
        userId: params.userId,
      })

      if (advanceResult.pipeline_blocked) {
        return { advanced, status: advanceResult.production.status }
      }

      const completedAfter = advanceResult.stages.filter((row) => row.status === 'completed').length
      const madeProgress =
        completedAfter > completedBefore ||
        advanceResult.production.status === 'completed' ||
        advanceResult.production.status === 'failed'

      if (!madeProgress) {
        return { advanced, status: advanceResult.production.status }
      }

      advanced++

      if (advanceResult.production.status === 'completed' || advanceResult.production.status === 'failed') {
        return { advanced, status: advanceResult.production.status }
      }
    } catch (err) {
      console.error('[v7-background] stage advance failed', {
        productionId: params.productionId,
        error: err instanceof Error ? err.message : err,
      })
      return { advanced, status: 'failed' }
    }
  }

  const final = await getV7Production(params.supabase, params.productionId, params.userId)
  return { advanced, status: final?.production.status ?? null }
}

/** Cron tick: one production, many immediately executable stages within the safety budget. */
export async function advanceActiveV7ProductionsOnce(params: {
  supabase: SupabaseClient
  limit?: number
}): Promise<{
  processed: number
  advanced: number
  skipped: number
  errors: number
}> {
  const limit = Math.min(params.limit ?? CRON_PRODUCTION_LIMIT, CRON_PRODUCTION_LIMIT)

  const rows = (await pickProductionForCronTick(params.supabase as SupabaseServerClient)).slice(
    0,
    limit
  )

  if (rows.length === 0) {
    return { processed: 0, advanced: 0, skipped: 0, errors: 0 }
  }

  let processed = 0
  let advanced = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    processed++
    try {
      const result = await runV7BackgroundDriveLoop({
        supabase: params.supabase,
        productionId: row.id,
        userId: row.user_id,
        maxStages: DEFAULT_MAX_STAGES,
        maxMs: CRON_DRIVE_MAX_MS,
      })
      console.info('[v7-background] cron drive finished', {
        productionId: row.id,
        stagesAdvanced: result.advanced,
        status: result.status,
      })
      if (result.advanced > 0) advanced++
      else skipped++
    } catch (err) {
      errors++
      console.error('[v7-background] cron production tick failed', {
        productionId: row.id,
        error: err instanceof Error ? err.message : err,
      })
    }
  }

  return { processed, advanced, skipped, errors }
}

/** Continue an authorized production after the HTTP response (Vercel waitUntil). */
export function scheduleV7ProductionBackgroundDrive(params: {
  productionId: string
  userId: string
}): void {
  runExportInBackground(async () => {
    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      console.error('[v7-background] SUPABASE_SERVICE_ROLE_KEY required for background drive')
      return
    }

    const result = await runV7BackgroundDriveLoop({
      supabase,
      productionId: params.productionId,
      userId: params.userId,
    })

    console.info('[v7-background] drive loop finished', {
      productionId: params.productionId,
      advanced: result.advanced,
      status: result.status,
    })
  })
}

export function verifyV7CronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }
  return req.headers.get('authorization') === `Bearer ${secret}`
}
