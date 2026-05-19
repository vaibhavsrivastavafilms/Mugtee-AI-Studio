// Phase P2 — Razorpay SDK client + plan auto-provisioning + signature verification.
// Test-mode only. Plans are auto-created on first checkout (no manual dashboard step needed).
// We cache plan IDs in module memory; persist long-lived IDs to .env if you want cross-restart stability.

import Razorpay from 'razorpay'
import crypto from 'crypto'

export type PlanKey = 'creator' | 'agency'

export interface PlanSpec {
  key: PlanKey
  label: string
  amountPaise: number     // INR subunits
  period: 'monthly'
  interval: 1
}

export const PLAN_SPECS: Record<PlanKey, PlanSpec> = {
  creator: { key: 'creator', label: 'Creator', amountPaise: 24500, period: 'monthly', interval: 1 },
  agency:  { key: 'agency',  label: 'Agency',  amountPaise: 99900, period: 'monthly', interval: 1 },
}

let _client: Razorpay | null = null
export function razorpay() {
  if (_client) return _client
  const key_id     = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) throw new Error('Razorpay keys missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)')
  _client = new Razorpay({ key_id, key_secret })
  return _client
}

// In-memory cache of created plan IDs. Resets on server restart, but each restart re-creates
// (Razorpay allows multiple plans w/ same definition — and we log + can be pinned via env).
const _planIdCache = new Map<PlanKey, string>()

export async function getOrCreatePlanId(key: PlanKey): Promise<string> {
  // 1) Prefer env override (stable across restarts in prod)
  const envOverride = key === 'creator' ? process.env.RAZORPAY_PLAN_CREATOR_ID : process.env.RAZORPAY_PLAN_AGENCY_ID
  if (envOverride) return envOverride
  // 2) Cached for this process
  const cached = _planIdCache.get(key)
  if (cached) return cached
  // 3) Auto-create
  const spec = PLAN_SPECS[key]
  const created = await razorpay().plans.create({
    period: spec.period,
    interval: spec.interval,
    item: {
      name: `Virlo ${spec.label}`,
      amount: spec.amountPaise,
      currency: 'INR',
      description: `Virlo ${spec.label} plan — monthly (test mode)`,
    },
  } as any)
  const planId = (created as any).id as string
  _planIdCache.set(key, planId)
  console.log(`[razorpay] Created ${key} plan: ${planId} — to make stable, set RAZORPAY_PLAN_${key.toUpperCase()}_ID=${planId} in .env`)
  return planId
}

/**
 * Verify subscription checkout signature returned by Razorpay's success handler.
 * Formula: HMAC_SHA256(payment_id + '|' + subscription_id, KEY_SECRET) === signature
 */
export function verifySubscriptionSignature(payload: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  const body = `${payload.razorpay_payment_id}|${payload.razorpay_subscription_id}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(payload.razorpay_signature, 'hex'),
  )
}

/** Verify webhook signature (HMAC over raw body) */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch { return false }
}
