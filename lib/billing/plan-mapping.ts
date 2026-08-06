/** Client-safe plan id mappings (no secrets). */

export function isBillingLive(): boolean {
  return process.env.BILLING_LIVE === 'true'
}

export function catalogPlanToRazorpay(planId: string): 'creator' | 'agency' | null {
  if (planId === 'creator') return 'creator'
  if (planId === 'pro' || planId === 'agency' || planId === 'studio') return 'agency'
  return null
}

export function catalogPlanToStripe(planId: string): 'creator' | 'pro' | 'agency' | null {
  if (planId === 'creator') return 'creator'
  if (planId === 'pro') return 'pro'
  if (planId === 'agency' || planId === 'studio') return 'agency'
  return null
}
