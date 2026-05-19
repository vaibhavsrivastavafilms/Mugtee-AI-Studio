// POST /api/billing/create-subscription { plan: 'creator' | 'agency' }
// Creates a Razorpay subscription, upserts pending row in `subscriptions`, returns subscription_id
// for client Checkout. Test-mode only.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { razorpay, getOrCreatePlanId, PLAN_SPECS, type PlanKey } from '@/lib/razorpay'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { plan?: PlanKey }
    const plan = body.plan
    if (plan !== 'creator' && plan !== 'agency') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planId = await getOrCreatePlanId(plan)
    const spec = PLAN_SPECS[plan]

    // Create subscription. total_count=12 = 12 monthly billing cycles (1 year).
    // Razorpay subscriptions require a finite total_count — use a large enough number for
    // the test/MVP window; renewal/auto-recharge happens for each cycle.
    const sub = await razorpay().subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        app_user_id: user.id,
        app_plan: plan,
        app_email: user.email || '',
      },
    } as any)

    // Upsert local pending row — keyed by user_id so prior plan is overwritten cleanly.
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      plan,
      status: 'pending',
      razorpay_subscription_id: (sub as any).id,
      razorpay_customer_id: (sub as any).customer_id || null,
      razorpay_plan_id: planId,
      amount: spec.amountPaise,
      currency: 'INR',
    }, { onConflict: 'user_id' })

    return NextResponse.json({
      subscriptionId: (sub as any).id,
      planId,
      plan,
      amount: spec.amountPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      email: user.email || '',
    })
  } catch (err: any) {
    console.error('[create-subscription]', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
