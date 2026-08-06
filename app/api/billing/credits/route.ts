import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCreditSnapshot } from '@/lib/billing/credits-engine.server'
import { formatLimitValue } from '@/lib/billing/plan-limits'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const snapshot = await getCreditSnapshot(user.id)

    return NextResponse.json({
      ok: true,
      plan_type: snapshot.plan_type,
      unlimited: snapshot.unlimited,
      limits_enabled: snapshot.limits_enabled,
      used: snapshot.used,
      limits: snapshot.limits,
      remaining: {
        projects: snapshot.unlimited
          ? null
          : Math.max(0, snapshot.limits.projects - snapshot.used.projects),
        generations: snapshot.unlimited
          ? null
          : Math.max(0, snapshot.limits.generations - snapshot.used.generations),
        exports: snapshot.unlimited
          ? null
          : Math.max(0, snapshot.limits.exports - snapshot.used.exports),
        renders: snapshot.unlimited
          ? null
          : Math.max(0, snapshot.limits.renders - snapshot.used.renders),
      },
      display: {
        generations: snapshot.unlimited
          ? 'Unlimited'
          : `${Math.max(0, snapshot.limits.generations - snapshot.used.generations)} / ${formatLimitValue(snapshot.limits.generations)}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load credits'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
