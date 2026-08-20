import { NextResponse } from 'next/server'

import { getAuthenticatedUser, isAuthNetworkFailure } from '@/lib/auth/server-user'
import { logProductionTiming } from '@/lib/perf/library-timing.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production, getV7ProductionForStudioRead } from '@/lib/v7/db.server'
import { scheduleV7ProductionBackgroundDrive } from '@/lib/v7/background-driver.server'
import {
  findRunningStage,
  reconcilePipelineIntegrity,
  shouldDrivePipeline,
  toV7AdvanceSnapshot,
} from '@/lib/v7/pipeline-sync.server'
import { buildV7ProductionErrorResponse } from '@/lib/v7/api-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 800

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const started = performance.now()
  let authMs = 0
  let queryMs = 0
  let relationsMs = 0
  let reconcileMs = 0

  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()

    const authStarted = performance.now()
    let user
    try {
      const authResult = await getAuthenticatedUser(supabase)
      if (authResult.error) {
        authMs = Math.round(performance.now() - authStarted)
        return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
      }
      user = authResult.user
    } catch (authErr) {
      authMs = Math.round(performance.now() - authStarted)
      if (isAuthNetworkFailure(authErr)) {
        return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
      }
      throw authErr
    }
    authMs = Math.round(performance.now() - authStarted)

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const readResult = await getV7ProductionForStudioRead(supabase, id, user.id)
    queryMs = readResult.timing.productionMs
    relationsMs = readResult.timing.relationsMs
    const snapshot = readResult.snapshot

    if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const reconcileStarted = performance.now()
    const reconciled =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId: id,
        userId: user.id,
        snapshot,
      })) ?? snapshot
    reconcileMs = Math.round(performance.now() - reconcileStarted)

    if (shouldDrivePipeline(reconciled)) {
      scheduleV7ProductionBackgroundDrive({
        productionId: id,
        userId: user.id,
      })
    }

    logProductionTiming({
      authMs,
      queryMs,
      relationsMs,
      reconcileMs,
      totalMs: Math.round(performance.now() - started),
      productionId: id,
    })

    return NextResponse.json({ ok: true, ...reconciled })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load production'
    const status = isAuthNetworkFailure(err) ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params

  try {
    const supabase = await createSupabaseServerClient()
    const authResult = await getAuthenticatedUser(supabase)
    if (authResult.error) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }
    const user = authResult.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let snapshot = await getV7Production(supabase, id, user.id)
    if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    snapshot =
      (await reconcilePipelineIntegrity({
        supabase,
        productionId: id,
        userId: user.id,
        snapshot,
      })) ?? snapshot

    const running = findRunningStage(snapshot.stages)
    if (running) {
      snapshot = toV7AdvanceSnapshot(snapshot, {
        blocked: true,
        reason: `${running.stage}_in_progress`,
      })
    }

    return NextResponse.json({ ok: true, ...snapshot })
  } catch (error) {
    const { status, body } = buildV7ProductionErrorResponse(error, { productionId: id })
    return NextResponse.json(body, { status })
  }
}
