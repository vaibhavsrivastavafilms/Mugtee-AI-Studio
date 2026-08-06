import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import { advanceV7Production } from '@/lib/v7/orchestrator.server'
import { shouldDrivePipeline, findRunningStage, reconcilePipelineIntegrity, toV7AdvanceSnapshot } from '@/lib/v7/pipeline-sync.server'
import { buildV7ProductionErrorResponse } from '@/lib/v7/api-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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

    if (shouldDrivePipeline(snapshot)) {
      try {
        snapshot = await advanceV7Production({
          supabase,
          productionId: id,
          userId: user.id,
        })
      } catch {
        snapshot = (await getV7Production(supabase, id, user.id)) ?? snapshot
      }
    }

    return NextResponse.json({ ok: true, ...snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load production'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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

    if (shouldDrivePipeline(snapshot)) {
      snapshot = await advanceV7Production({
        supabase,
        productionId: id,
        userId: user.id,
      })
    } else if (findRunningStage(snapshot.stages)) {
      const running = findRunningStage(snapshot.stages)!
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
