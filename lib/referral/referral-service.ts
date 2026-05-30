import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getReferralMilestones,
  rewardsForSignupCount,
} from '@/lib/billing/referral-rewards'
import { buildReferralLink } from '@/lib/referral/constants'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LEN = 8
const MAX_CODE_ATTEMPTS = 12

function randomReferralCode(): string {
  const bytes = randomBytes(CODE_LEN)
  let out = ''
  for (let i = 0; i < CODE_LEN; i++) {
    out += CODE_CHARS[bytes[i]! % CODE_CHARS.length]
  }
  return out
}

export async function ensureReferralCode(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: row } = await db
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()

  if (row?.referral_code) return String(row.referral_code)

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = randomReferralCode()
    const { error } = await db.from('profiles').upsert(
      { id: userId, referral_code: code },
      { onConflict: 'id' }
    )
    if (!error) return code
    if (!error.message.toLowerCase().includes('unique')) throw error
  }

  throw new Error('Could not allocate referral code')
}

export type ReferralStats = {
  code: string
  link: string
  invites_sent: number
  successful_signups: number
  rewards_earned: number
  bonus_generations: number
  creator_plan_bonus: boolean
  next_milestone: { referrals: number; label: string } | null
}

export async function getReferralStats(
  db: SupabaseClient,
  userId: string
): Promise<ReferralStats> {
  const code = await ensureReferralCode(db, userId)

  const { data: profile } = await db
    .from('profiles')
    .select(
      'referral_invites_sent, referral_bonus_generations, referral_creator_plan_bonus'
    )
    .eq('id', userId)
    .maybeSingle()

  const { count } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)

  const successfulSignups = count ?? 0
  const bonusGenerations = Number(profile?.referral_bonus_generations ?? 0)
  const creatorPlanBonus = !!profile?.referral_creator_plan_bonus

  const milestones = getReferralMilestones()
  const next = milestones.find((m) => m.referrals > successfulSignups) ?? null

  return {
    code,
    link: buildReferralLink(code),
    invites_sent: Number(profile?.referral_invites_sent ?? 0),
    successful_signups: successfulSignups,
    rewards_earned: bonusGenerations,
    bonus_generations: bonusGenerations,
    creator_plan_bonus: creatorPlanBonus,
    next_milestone: next
      ? { referrals: next.referrals, label: next.label }
      : null,
  }
}

export async function trackReferralVisit(
  db: SupabaseClient,
  code: string,
  visitorUserId?: string | null
): Promise<{ ok: boolean }> {
  const normalized = String(code || '')
    .trim()
    .toUpperCase()
    .slice(0, 32)
  if (!normalized) return { ok: false }

  const { data: referrer } = await db
    .from('profiles')
    .select('id, referral_invites_sent')
    .eq('referral_code', normalized)
    .maybeSingle()

  if (!referrer?.id) return { ok: false }
  if (visitorUserId && visitorUserId === referrer.id) return { ok: true }

  const next = Number(referrer.referral_invites_sent ?? 0) + 1
  await db
    .from('profiles')
    .update({ referral_invites_sent: next })
    .eq('id', referrer.id)

  return { ok: true }
}

async function applyReferrerRewards(
  db: SupabaseClient,
  referrerId: string
): Promise<void> {
  const { count } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)

  const signupCount = count ?? 0
  const { bonusGenerations, creatorPlanBonus } = rewardsForSignupCount(signupCount)

  await db
    .from('profiles')
    .update({
      referral_bonus_generations: bonusGenerations,
      referral_creator_plan_bonus: creatorPlanBonus,
    })
    .eq('id', referrerId)

  await db
    .from('referrals')
    .update({ reward_granted: true })
    .eq('referrer_id', referrerId)
    .eq('reward_granted', false)
}

export type ClaimReferralResult =
  | { ok: true; claimed: true; referrer_id: string }
  | { ok: true; claimed: false; reason: string }
  | { ok: false; error: string }

export async function claimReferral(
  db: SupabaseClient,
  inviteeId: string,
  code: string
): Promise<ClaimReferralResult> {
  const normalized = String(code || '')
    .trim()
    .toUpperCase()
    .slice(0, 32)
  if (!normalized) {
    return { ok: true, claimed: false, reason: 'no_code' }
  }

  const { data: existingInvitee } = await db
    .from('referrals')
    .select('id')
    .eq('invitee_id', inviteeId)
    .maybeSingle()

  if (existingInvitee) {
    return { ok: true, claimed: false, reason: 'already_attributed' }
  }

  const { data: referrer } = await db
    .from('profiles')
    .select('id')
    .eq('referral_code', normalized)
    .maybeSingle()

  if (!referrer?.id) {
    return { ok: true, claimed: false, reason: 'invalid_code' }
  }

  if (referrer.id === inviteeId) {
    return { ok: true, claimed: false, reason: 'self_referral' }
  }

  const { error: insertErr } = await db.from('referrals').insert({
    referrer_id: referrer.id,
    invitee_id: inviteeId,
    code: normalized,
    reward_granted: false,
  })

  if (insertErr) {
    if (insertErr.message.includes('unique')) {
      return { ok: true, claimed: false, reason: 'already_attributed' }
    }
    return { ok: false, error: insertErr.message }
  }

  await applyReferrerRewards(db, referrer.id)

  return { ok: true, claimed: true, referrer_id: referrer.id }
}
