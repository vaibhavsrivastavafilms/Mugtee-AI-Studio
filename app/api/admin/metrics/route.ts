import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { computeCreatorValidationMetrics } from '@/lib/analytics/compute-metrics'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 30)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json({
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY required for admin metrics',
    }, { status: 503 })
  }

  const { data: events, error: evErr } = await db
    .from('analytics_events')
    .select('event, user_id, session_id, metadata, created_at')
    .gte('created_at', since)
    .limit(10000)

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

  const { data: feedback } = await db
    .from('creator_feedback')
    .select('rating, user_id, project_id, created_at')
    .gte('created_at', since)
    .limit(5000)

  const { data: projects } = await db
    .from('cinematic_projects')
    .select('user_id')
    .gte('created_at', since)
    .limit(10000)

  const projectCountByUser: Record<string, number> = {}
  for (const p of projects || []) {
    if (!p.user_id) continue
    projectCountByUser[p.user_id] = (projectCountByUser[p.user_id] || 0) + 1
  }

  const metrics = computeCreatorValidationMetrics(
    (events || []).map((e) => ({
      event: e.event,
      user_id: e.user_id,
      session_id: e.session_id,
      metadata: (e.metadata || {}) as Record<string, unknown>,
      created_at: e.created_at,
    })),
    (feedback || []).map((f) => ({
      rating: f.rating,
      user_id: f.user_id,
      project_id: f.project_id,
      created_at: f.created_at,
    })),
    projectCountByUser,
    days
  )

  return NextResponse.json({ ok: true, metrics })
}
