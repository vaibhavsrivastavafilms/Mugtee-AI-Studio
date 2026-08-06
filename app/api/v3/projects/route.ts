import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV3Project, insertV3Project, listV3Projects } from '@/lib/v3/db.server'
import { runV3ProductionPhase1 } from '@/lib/v3/orchestrator.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { buildV3ProjectErrorResponse } from '@/agents/shared/v3-api-errors.server'
import {
  createV3RequestContext,
  logV3ProductionEvent,
} from '@/lib/v3/production-diagnostics.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await listV3Projects(supabase, user.id)
    return NextResponse.json({ ok: true, projects })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let projectId: string | undefined
  const ctx = createV3RequestContext({ stage: 'planner' })
  const startedAt = Date.now()

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a production.' }, { status: 401 })
    }

    ctx.userId = user.id

    const body = (await req.json().catch(() => null)) as {
      prompt?: string
      projectId?: string
    } | null
    const prompt = body?.prompt?.trim() ?? ''
    if (prompt.length < 8) {
      return NextResponse.json(
        { error: 'Describe your video in at least 8 characters.' },
        { status: 400 }
      )
    }

    logV3ProductionEvent('info', 'create_project_start', ctx, {
      promptLength: prompt.length,
      retry: Boolean(body?.projectId),
    })

    if (body?.projectId) {
      const existing = await getV3Project(supabase, body.projectId, user.id)
      if (!existing) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      projectId = existing.project.id
    } else {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked

      const project = await insertV3Project(supabase, {
        userId: user.id,
        prompt,
      })
      projectId = project.id
    }

    ctx.projectId = projectId

    const snapshot = await runV3ProductionPhase1({
      supabase,
      projectId,
      userId: user.id,
      prompt,
    })

    if (!body?.projectId) {
      await trackUsageMetric(user.id, 'generations')
      await trackUsageMetric(user.id, 'projects')
    }

    ctx.latencyMs = Date.now() - startedAt
    logV3ProductionEvent('info', 'create_project_success', ctx, {
      stage: snapshot.project.current_stage ?? 'planning',
    })

    return NextResponse.json({
      ok: true,
      success: true,
      requestId: ctx.requestId,
      projectId: snapshot.project.id,
      plan: snapshot.project.production_plan,
      timeline: snapshot.timeline,
    })
  } catch (err) {
    ctx.latencyMs = Date.now() - startedAt
    ctx.projectId = projectId
    logV3ProductionEvent('error', 'create_project_failed', ctx, {
      error: err instanceof Error ? err.message : String(err),
    })

    const response = buildV3ProjectErrorResponse(err, projectId)
    const json = await response.clone().json()
    return NextResponse.json({ ...json, requestId: ctx.requestId }, { status: response.status })
  }
}
