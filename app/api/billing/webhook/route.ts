// POST /api/billing/webhook — Razorpay subscription lifecycle (renewal, cancel, failure).
// Entitlements are written only via service role (subscriptions + profiles mirror).

import { NextResponse } from 'next/server'
import { verifyWebhookSignature, type PlanKey } from '@/lib/razorpay'
import { syncSubscriptionEntitlements } from '@/lib/billing/sync-subscription-entitlements.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RazorpayWebhookPayload = {
  event?: string
  payload?: {
    subscription?: {
      entity?: {
        id?: string
        status?: string
        plan_id?: string
        current_start?: number
        current_end?: number
        ended_at?: number
        notes?: Record<string, string>
      }
    }
    payment?: {
      entity?: { id?: string }
    }
  }
}

function parsePlan(notes: Record<string, string> | undefined): PlanKey | null {
  const p = notes?.app_plan
  if (p === 'creator' || p === 'agency') return p
  return null
}

function isoFromUnix(sec: number | undefined): string | null {
  if (!sec || !Number.isFinite(sec)) return null
  return new Date(sec * 1000).toISOString()
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let body: RazorpayWebhookPayload
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event ?? ''
  const sub = body.payload?.subscription?.entity
  const userId = sub?.notes?.app_user_id
  const plan = parsePlan(sub?.notes)
  const subscriptionId = sub?.id

  if (!userId || !plan || !subscriptionId) {
    return NextResponse.json({ ok: true, skipped: 'missing_identity' })
  }

  const periodStart = isoFromUnix(sub?.current_start)
  const periodEnd = isoFromUnix(sub?.current_end)
  const endsAt = isoFromUnix(sub?.ended_at)

  let status: 'active' | 'pending' | 'cancelled' | 'past_due' | 'halted' = 'pending'

  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged':
      status = 'active'
      break
    case 'subscription.pending':
      status = 'pending'
      break
    case 'subscription.halted':
      status = 'halted'
      break
    case 'subscription.cancelled':
      status = 'cancelled'
      break
    default:
      return NextResponse.json({ ok: true, ignored: event })
  }

  const result = await syncSubscriptionEntitlements({
    userId,
    plan,
    status,
    razorpaySubscriptionId: subscriptionId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    endsAt,
    raw: {
      event,
      payment_id: body.payload?.payment?.entity?.id,
      received_at: new Date().toISOString(),
    },
  })

  if (!result.ok) {
    console.error('[billing/webhook]', event, result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event, status })
}
