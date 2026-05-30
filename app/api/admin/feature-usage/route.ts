import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { computeFeatureUsageIntelligenceMetrics } from '@/lib/analytics/compute-feature-usage-metrics'
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
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY required for feature usage metrics' },
      { status: 503 }
    )
  }

  const { data, error } = await db
    .from('feature_usage_events')
    .select('user_id, feature, project_id, created_at')
    .gte('created_at', since)
    .limit(50_000)

  if (error) {
    const missing = error.message.includes('feature_usage_events')
    if (missing) {
      const metrics = computeFeatureUsageIntelligenceMetrics([], days, false)
      return NextResponse.json({ ok: true, metrics })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const metrics = computeFeatureUsageIntelligenceMetrics(
    (data || []).map((r) => ({
      user_id: r.user_id,
      feature: r.feature,
      project_id: r.project_id,
      created_at: r.created_at,
    })),
    days,
    true
  )

  return NextResponse.json({ ok: true, metrics })
}
