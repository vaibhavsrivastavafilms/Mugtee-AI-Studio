import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { V7StageId } from '@/types/v7/production'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 800

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { stage?: V7StageId } | null

    const { retryV7FailedStage } = await import('@/lib/v7/retry-stage.server')
    const snapshot = await retryV7FailedStage({
      supabase,
      productionId: id,
      userId: user.id,
      stage: body?.stage,
    })

    const failedStage = snapshot.stages.find((row) => row.status === 'failed')
    if (failedStage) {
      const { buildV7ProductionErrorResponse, V7StageExecutionError } = await import(
        '@/lib/v7/api-errors.server'
      )
      const stageError = new V7StageExecutionError(failedStage.stage as V7StageId, new Error(failedStage.error ?? 'Stage failed'), {
        productionId: id,
      })
      const { status, body: errBody } = buildV7ProductionErrorResponse(stageError, {
        productionId: id,
        stage: failedStage.stage as V7StageId,
      })
      return NextResponse.json({ ok: false, ...errBody, ...snapshot }, { status })
    }

    const { scheduleV7ProductionBackgroundDrive } = await import(
      '@/lib/v7/background-driver.server'
    )
    if (snapshot.production.status === 'producing') {
      scheduleV7ProductionBackgroundDrive({ productionId: id, userId: user.id })
    }

    return NextResponse.json({ ok: true, ...snapshot })
  } catch (error) {
    const { buildV7ProductionErrorResponse, V7StageExecutionError } = await import(
      '@/lib/v7/api-errors.server'
    )
    const { getV7Production } = await import('@/lib/v7/db.server')

    const stage =
      error instanceof V7StageExecutionError ? error.stage : bodyStageFromMessage(error)

    if (error instanceof Error && error.message === 'Production not found') {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: error.message },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message === 'No failed stage to retry') {
      return NextResponse.json(
        { success: false, error: 'NO_FAILED_STAGE', message: error.message },
        { status: 400 }
      )
    }

    const { status, body: errBody } = buildV7ProductionErrorResponse(error, {
      productionId: id,
      stage,
    })

    try {
      const supabase = await createSupabaseServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const snapshot = await getV7Production(supabase, id, user.id)
        if (snapshot) {
          return NextResponse.json({ ok: false, ...errBody, ...snapshot }, { status })
        }
      }
    } catch (snapshotErr) {
      console.error('[v7-retry] failed to load snapshot after error', {
        productionId: id,
        error: snapshotErr,
      })
    }

    return NextResponse.json({ ok: false, ...errBody }, { status })
  }
}

function bodyStageFromMessage(error: unknown): V7StageId | undefined {
  if (!(error instanceof Error)) return undefined
  const match = error.message.match(/stage[:\s]+([a-z]+)/i)
  return match?.[1] as V7StageId | undefined
}
