import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { runExportInBackground } from '@/lib/export/export-background.server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import { advanceV7Production } from '@/lib/v7/orchestrator.server'
import {
  findRunningStage,
  reconcilePipelineIntegrity,
  shouldDrivePipeline,
} from '@/lib/v7/pipeline-sync.server'

const DEFAULT_MAX_STAGES = 48
const DEFAULT_MAX_MS = 280_000
const CRON_PRODUCTION_LIMIT = 8

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
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

    try {
      await advanceV7Production({
        supabase: params.supabase as SupabaseServerClient,
        productionId: params.productionId,
        userId: params.userId,
      })
      advanced++
    } catch (err) {
      console.error('[v7-background] stage advance failed', {
        productionId: params.productionId,
        error: err instanceof Error ? err.message : err,
      })
      return { advanced, status: 'failed' }
    }

    await sleep(300)
  }

  const final = await getV7Production(params.supabase, params.productionId, params.userId)
  return { advanced, status: final?.production.status ?? null }
}

/** Cron tick: one stage per active production (bounded batch). */
export async function advanceActiveV7ProductionsOnce(params: {
  supabase: SupabaseClient
  limit?: number
}): Promise<{
  processed: number
  advanced: number
  skipped: number
  errors: number
}> {
  const limit = params.limit ?? CRON_PRODUCTION_LIMIT
  const { data, error } = await params.supabase
    .from('v7_productions')
    .select('id,user_id,status,updated_at')
    .eq('status', 'producing')
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[v7-background] list active productions failed', error.message)
    throw new Error(error.message)
  }

  let processed = 0
  let advanced = 0
  let skipped = 0
  let errors = 0

  for (const row of data ?? []) {
    processed++
    try {
      const result = await runV7BackgroundDriveLoop({
        supabase: params.supabase,
        productionId: row.id,
        userId: row.user_id,
        maxStages: 1,
        maxMs: 240_000,
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
