import { NextResponse } from 'next/server'
import { computeValidationDashboardMetrics } from '@/lib/admin/validation-dashboard'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/** JSON founder report for last 7 or 30 days (admin-only). */
export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY required for validation report' },
      { status: 503 }
    )
  }

  const url = new URL(req.url)
  const rawDays = Number(url.searchParams.get('days') || 7)
  const days = rawDays === 30 ? 30 : 7

  try {
    const metrics = await computeValidationDashboardMetrics(db, days)
    return NextResponse.json({
      ok: true,
      window_days: days,
      generated_at: metrics.generated_at,
      growth: {
        new_users_this_week: metrics.founder_summary.new_users_this_week,
        new_users_prior_week: metrics.founder_summary.new_users_prior_week,
        week_over_week_pct: metrics.founder_summary.growth_wow_pct,
        new_users_today: metrics.users.new_today,
        new_users_month: metrics.users.new_this_month,
      },
      retention: {
        returning_users_pct: metrics.founder_summary.retention_pct,
        active_users_7d: metrics.users.active_7d,
        active_users_30d: metrics.users.active_30d,
      },
      revenue: {
        upgrade_waitlist_total: metrics.upgrade_intent.waitlist_total,
        upgrade_waitlist_in_window: metrics.upgrade_intent.waitlist_in_window,
        plan_interest: metrics.upgrade_intent.by_plan,
      },
      product: {
        top_features: metrics.top_features.most_used,
        least_used_features: metrics.top_features.least_used,
        most_requested_features: metrics.feedback.most_requested_features,
        pain_themes: metrics.feedback.most_common_complaints,
      },
      activity: metrics.activity,
      report_text: metrics.founder_summary.report_text,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'validation_report_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
