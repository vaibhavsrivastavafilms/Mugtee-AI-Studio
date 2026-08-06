import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCreditSnapshot } from '@/lib/billing/credits-engine.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ plan: 'free', status: 'none' })

    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, ends_at, raw')
      .eq('user_id', user.id)
      .maybeSingle()

    const credits = await getCreditSnapshot(user.id)

    if (!data) {
      return NextResponse.json({
        plan: 'free',
        status: 'none',
        plan_type: credits.plan_type,
        credits,
      })
    }

    const effectivePlan = data.status === 'active' ? data.plan : 'free'
    const raw = (data.raw ?? {}) as { provider?: string }
    return NextResponse.json({
      plan: effectivePlan,
      raw_plan: data.plan,
      status: data.status,
      provider: raw.provider ?? 'razorpay',
      current_period_end: data.current_period_end,
      ends_at: data.ends_at,
      plan_type: credits.plan_type,
      credits,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'billing lookup failed'
    return NextResponse.json({ plan: 'free', status: 'none', error: message })
  }
}
