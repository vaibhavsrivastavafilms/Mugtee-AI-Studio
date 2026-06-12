import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type { PlanKey } from '@/lib/razorpay'

/** Map Razorpay subscription plan → profiles.plan_type (service-role only). */
export function planKeyToProfilePlanType(plan: PlanKey): string {
  return plan === 'agency' ? 'PRO' : 'CREATOR'
}

/** Single source of truth: subscriptions row drives entitlements; profiles mirror for legacy reads. */
export async function syncSubscriptionEntitlements(input: {
  userId: string
  plan: PlanKey
  status: 'active' | 'pending' | 'cancelled' | 'past_due' | 'halted'
  razorpaySubscriptionId: string
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  endsAt?: string | null
  raw?: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string }> {
  const db = createSupabaseServiceClient()
  if (!db) return { ok: false, error: 'Service role unavailable' }

  const { error: subErr } = await db.from('subscriptions').upsert(
    {
      user_id: input.userId,
      plan: input.plan,
      status: input.status,
      razorpay_subscription_id: input.razorpaySubscriptionId,
      current_period_start: input.currentPeriodStart ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
      ends_at: input.endsAt ?? null,
      raw: input.raw ?? {},
    },
    { onConflict: 'user_id' }
  )
  if (subErr) return { ok: false, error: subErr.message }

  const profilePlan =
    input.status === 'active' ? planKeyToProfilePlanType(input.plan) : 'FREE'

  const { error: profErr } = await db
    .from('profiles')
    .update({ plan_type: profilePlan })
    .eq('id', input.userId)
  if (profErr) return { ok: false, error: profErr.message }

  return { ok: true }
}
