import { NextResponse } from 'next/server'
import { computeFounderDashboardMetrics } from '@/lib/admin/founder-dashboard-metrics'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY required for admin dashboard' },
      { status: 503 }
    )
  }

  try {
    const metrics = await computeFounderDashboardMetrics(db)
    return NextResponse.json({ ok: true, metrics })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'dashboard_metrics_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
