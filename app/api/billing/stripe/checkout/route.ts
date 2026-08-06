import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  hasStripeConfigured,
  resolvePaymentProvider,
  stripePriceIdForPlan,
} from '@/lib/billing/payment-provider'
import { isBillingLive } from '@/lib/billing/plan-mapping'

export const dynamic = 'force-dynamic'

type CheckoutPlan = 'creator' | 'pro' | 'agency'

function planToProfileType(plan: CheckoutPlan): string {
  if (plan === 'creator') return 'CREATOR'
  if (plan === 'pro') return 'PRO'
  return 'AGENCY'
}

export async function POST(req: Request) {
  try {
    if (!isBillingLive()) {
      return NextResponse.json({ error: 'Billing is not live yet' }, { status: 503 })
    }

    if (resolvePaymentProvider() !== 'stripe' || !hasStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { plan?: CheckoutPlan }
    const plan = body.plan
    if (plan !== 'creator' && plan !== 'pro' && plan !== 'agency') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = stripePriceIdForPlan(plan)
    if (!priceId) {
      return NextResponse.json({ error: `Missing Stripe price for ${plan}` }, { status: 503 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/pricing?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: {
        app_user_id: user.id,
        app_plan: plan,
        app_profile_plan: planToProfileType(plan),
      },
      subscription_data: {
        metadata: {
          app_user_id: user.id,
          app_plan: plan,
        },
      },
    })

    await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan,
        status: 'pending',
        raw: {
          provider: 'stripe',
          stripe_checkout_session_id: session.id,
        },
      },
      { onConflict: 'user_id' }
    )

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
