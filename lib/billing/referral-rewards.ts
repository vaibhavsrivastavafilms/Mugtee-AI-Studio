/** Creator Referral Program — milestone rewards (env-overridable). */

export type ReferralMilestone = {
  referrals: number
  bonusGenerations: number
  creatorPlanBonus: boolean
  label: string
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function getReferralMilestones(): ReferralMilestone[] {
  return [
    {
      referrals: 1,
      bonusGenerations: parseIntEnv('MUGTEE_REFERRAL_BONUS_1', 10),
      creatorPlanBonus: false,
      label: 'First invite',
    },
    {
      referrals: 5,
      bonusGenerations: parseIntEnv('MUGTEE_REFERRAL_BONUS_5', 50),
      creatorPlanBonus: false,
      label: '5 creators',
    },
    {
      referrals: 10,
      bonusGenerations: parseIntEnv('MUGTEE_REFERRAL_BONUS_10', 50),
      creatorPlanBonus: true,
      label: 'Creator Plan Bonus',
    },
  ]
}

/** Highest milestone reached for a successful signup count. */
export function rewardsForSignupCount(signupCount: number): {
  bonusGenerations: number
  creatorPlanBonus: boolean
  milestone: ReferralMilestone | null
} {
  const milestones = getReferralMilestones().slice().sort((a, b) => a.referrals - b.referrals)
  let bonusGenerations = 0
  let creatorPlanBonus = false
  let milestone: ReferralMilestone | null = null

  for (const m of milestones) {
    if (signupCount >= m.referrals) {
      bonusGenerations = m.bonusGenerations
      creatorPlanBonus = m.creatorPlanBonus
      milestone = m
    }
  }

  return { bonusGenerations, creatorPlanBonus, milestone }
}

/** Extended generation cap when Creator Plan Bonus is active (non-Stripe). */
export function getReferralCreatorPlanGenerationCap(): number {
  return parseIntEnv('MUGTEE_REFERRAL_CREATOR_GENERATIONS', 200)
}
