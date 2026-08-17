import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { USER_IDEA_MAX_CHARS } from '@/lib/v7/creative-planning-validation'
import { getV7Production, listV7Productions } from '@/lib/v7/db.server'
import { bootstrapV7Production } from '@/lib/v7/orchestrator.server'
import { scheduleV7ProductionBackgroundDrive } from '@/lib/v7/background-driver.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { buildV7ProductionErrorResponse } from '@/lib/v7/api-errors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const productions = await listV7Productions(supabase, user.id)
    return NextResponse.json({ ok: true, productions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list productions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let productionId: string | undefined

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a film.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      idea?: string
      productionId?: string
    } | null

    const idea = body?.idea?.trim() ?? ''
    if (idea.length < 8) {
      return NextResponse.json(
        { error: 'Describe your idea in at least 8 characters.' },
        { status: 400 }
      )
    }
    if (idea.length > USER_IDEA_MAX_CHARS) {
      return NextResponse.json(
        { error: `Describe your idea in ${USER_IDEA_MAX_CHARS} characters or fewer.` },
        { status: 400 }
      )
    }

    if (!body?.productionId) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const snapshot = await bootstrapV7Production({
      supabase,
      userId: user.id,
      prompt: idea,
      productionId: body?.productionId,
    })

    productionId = snapshot.production.id

    scheduleV7ProductionBackgroundDrive({
      productionId: snapshot.production.id,
      userId: user.id,
    })

    if (!body?.productionId) {
      await trackUsageMetric(user.id, 'generations')
      await trackUsageMetric(user.id, 'projects')
    }

    return NextResponse.json({
      ok: true,
      productionId: snapshot.production.id,
      timeline: snapshot.timeline,
      brief: snapshot.production.creative_brief,
    })
  } catch (error) {
    const { status, body } = buildV7ProductionErrorResponse(error, {
      productionId,
      stage: 'idea',
    })
    return NextResponse.json(body, { status })
  }
}
