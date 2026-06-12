/** Unified subscription tier for monetization gating. */
export type SubscriptionTier = 'FREE' | 'PRO'

export type SubscriptionTierInput = {
  /** Client plan from useUsage — free | creator | agency */
  plan?: 'free' | 'creator' | 'agency'
  /** Trial or paid unlimited from useUsage */
  isUnlimited?: boolean
  /** Server plan_type from profiles — FREE | PRO | PRO_TRIAL | CREATOR */
  planType?: string | null
}

/** Resolve whether the user is on FREE (show ads) or PRO (ad-free). */
export function resolveSubscriptionTier(input: SubscriptionTierInput): SubscriptionTier {
  if (input.isUnlimited) return 'PRO'
  if (input.plan === 'creator' || input.plan === 'agency') return 'PRO'

  const normalized = String(input.planType ?? 'FREE').toUpperCase()
  if (
    normalized === 'PRO' ||
    normalized === 'PRO_TRIAL' ||
    normalized === 'CREATOR' ||
    normalized === 'AGENCY'
  ) {
    return 'PRO'
  }

  return 'FREE'
}

export function shouldShowSponsoredContent(tier: SubscriptionTier): boolean {
  return tier === 'FREE'
}

export function isAdFreeExperience(tier: SubscriptionTier): boolean {
  return tier === 'PRO'
}
