'use client'

import { useMemo } from 'react'
import { useUsage } from '@/lib/usage'
import {
  isAdFreeExperience,
  resolveSubscriptionTier,
  shouldShowSponsoredContent,
  type SubscriptionTier,
} from '@/lib/monetization/subscription-tier'

export function useSubscriptionTier() {
  const { plan, isUnlimited, trial } = useUsage()

  const tier: SubscriptionTier = useMemo(
    () =>
      resolveSubscriptionTier({
        plan,
        isUnlimited,
        planType: trial.planType,
      }),
    [plan, isUnlimited, trial.planType]
  )

  return {
    tier,
    showSponsoredContent: shouldShowSponsoredContent(tier),
    isAdFree: isAdFreeExperience(tier),
    plan,
    isUnlimited,
  }
}
