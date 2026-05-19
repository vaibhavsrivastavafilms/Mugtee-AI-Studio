// GET /api/billing/me — returns the current user's effective plan/status for client bootstrap.
// Read by lib/usage.tsx on mount to keep localStorage['virlo:plan'] in sync with Supabase.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ plan: 'free', status: 'none' })

    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data) return NextResponse.json({ plan: 'free', status: 'none' })

    // Effective plan: only 'active' grants entitlements.
    const effectivePlan = data.status === 'active' ? data.plan : 'free'
    return NextResponse.json({
      plan: effectivePlan,
      raw_plan: data.plan,
      status: data.status,
      current_period_end: data.current_period_end,
      ends_at: data.ends_at,
    })
  } catch (err: any) {
    console.error('[billing/me]', err)
    return NextResponse.json({ plan: 'free', status: 'none' })
  }
}
