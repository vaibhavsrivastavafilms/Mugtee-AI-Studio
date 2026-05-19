// POST /api/billing/verify
// Verifies the signature Razorpay returns to the client `handler` after a successful subscription auth.
// Marks the user's subscription row as `active`. No public webhook needed for the MVP.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifySubscriptionSignature } from '@/lib/razorpay'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
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

    // Find this subscription row — it must belong to the calling user.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('plan, razorpay_subscription_id')
      .eq('user_id', user.id)
      .eq('razorpay_subscription_id', razorpay_subscription_id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Subscription not found for user' }, { status: 404 })

    // Optional: hit Razorpay to fetch authoritative period info. Kept minimal here.
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end:   next.toISOString(),
        raw: { last_payment_id: razorpay_payment_id, verified_at: now.toISOString() },
      })
      .eq('user_id', user.id)
      .eq('razorpay_subscription_id', razorpay_subscription_id)
    if (updErr) {
      console.error('[verify] update failed', updErr)
      return NextResponse.json({ error: 'Could not persist active status' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, plan: existing.plan, status: 'active' })
  } catch (err: any) {
    console.error('[verify]', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
