import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifySubscriptionSignature } from '@/lib/razorpay'
import { syncSubscriptionEntitlements } from '@/lib/billing/sync-subscription-entitlements.server'
import type { PlanKey } from '@/lib/razorpay'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      razorpay_payment_id?: string
      razorpay_subscription_id?: string
      razorpay_signature?: string
    }
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing signature fields' }, { status: 400 })
    }

    const ok = verifySubscriptionSignature({ razorpay_payment_id, razorpay_subscription_id, razorpay_signature })
    if (!ok) return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 })

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('plan, razorpay_subscription_id')
      .eq('user_id', user.id)
      .eq('razorpay_subscription_id', razorpay_subscription_id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Subscription not found for user' }, { status: 404 })

    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const plan = existing.plan as PlanKey

    const sync = await syncSubscriptionEntitlements({
      userId: user.id,
      plan,
      status: 'active',
      razorpaySubscriptionId: razorpay_subscription_id,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: next.toISOString(),
      raw: { last_payment_id: razorpay_payment_id, verified_at: now.toISOString() },
    })

    if (!sync.ok) {
      return NextResponse.json({ error: sync.error ?? 'Entitlement sync failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, plan, status: 'active' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
