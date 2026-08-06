import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV3Project, insertV3Project, listV3Projects } from '@/lib/v3/db.server'
import { runV3ProductionPhase1 } from '@/lib/v3/orchestrator.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { buildV3ProjectErrorResponse } from '@/agents/shared/v3-api-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** MVP alias — list user projects. */
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

/** MVP alias — create project from single prompt and start planner. */
export async function POST(req: Request) {
  let projectId: string | undefined

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a project.' }, { status: 401 })
    }

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

    return NextResponse.json({
      ok: true,
      success: true,
      projectId: snapshot.project.id,
      plan: snapshot.project.production_plan,
      timeline: snapshot.timeline,
    })
  } catch (err) {
    return buildV3ProjectErrorResponse(err, projectId)
  }
}
