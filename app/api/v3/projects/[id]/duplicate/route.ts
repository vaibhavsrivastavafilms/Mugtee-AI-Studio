import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { duplicateV3Project } from '@/lib/v3/duplicate-project.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = await guardUsageLimit(user.id, 'generations')
    if (blocked) return blocked

    const snapshot = await duplicateV3Project({
      supabase,
      projectId: id,
      userId: user.id,
    })

    await trackUsageMetric(user.id, 'generations')
    await trackUsageMetric(user.id, 'projects')

    return NextResponse.json({
      ok: true,
      projectId: snapshot.project.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Duplicate failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
