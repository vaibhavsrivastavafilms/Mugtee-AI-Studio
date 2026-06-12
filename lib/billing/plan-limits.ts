/** Admin-configurable plan caps (Phase 2.8 + Phase 4 monetization validation). */

import { getReferralCreatorPlanGenerationCap } from '@/lib/billing/referral-rewards'

export type UsageMetric = 'projects' | 'generations' | 'exports' | 'renders'

export type PlanLimits = Record<UsageMetric, number>

export type PaidPlanTier = 'CREATOR' | 'PRO'

const DEFAULT_LIMITS: PlanLimits = {
  projects: 5,
  generations: 5,
  exports: 1,
  renders: 1,
}

const DEFAULT_CREATOR_LIMITS: PlanLimits = {
  projects: 25,
  generations: 30,
  exports: 5,
  renders: 5,
}

const DEFAULT_PRO_LIMITS: PlanLimits = {
  projects: 100,
  generations: 100,
  exports: 20,
  renders: 20,
}

const DEFAULT_STUDIO_LIMITS: PlanLimits = {
  projects: 200,
  generations: 300,
  exports: 50,
  renders: 50,
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** When false, all limit checks pass (useful for local dev). */
export function areLimitsEnabled(): boolean {
  return process.env.MUGTEE_LIMITS_ENABLED !== 'false'
}

export function getFreePlanLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_LIMIT_PROJECTS, DEFAULT_LIMITS.projects),
    generations: parseLimit(
      process.env.MUGTEE_LIMIT_GENERATIONS,
      DEFAULT_LIMITS.generations
    ),
    exports: parseLimit(process.env.MUGTEE_LIMIT_EXPORTS, DEFAULT_LIMITS.exports),
    renders: parseLimit(process.env.MUGTEE_LIMIT_RENDERS, DEFAULT_LIMITS.renders),
  }
}

/** Phase 4 — Creator tier caps (env: MUGTEE_CREATOR_LIMIT_*). */
export function getCreatorPlanLimits(): PlanLimits {
  return {
    projects: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_PROJECTS,
      DEFAULT_CREATOR_LIMITS.projects
    ),
    generations: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_GENERATIONS,
      DEFAULT_CREATOR_LIMITS.generations
    ),
    exports: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_EXPORTS,
      DEFAULT_CREATOR_LIMITS.exports
    ),
    renders: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_RENDERS,
      DEFAULT_CREATOR_LIMITS.renders
    ),
  }
}

/** Phase 4 — Pro tier caps (env: MUGTEE_PRO_LIMIT_*). */
export function getProPlanLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_PRO_LIMIT_PROJECTS, DEFAULT_PRO_LIMITS.projects),
    generations: parseLimit(
      process.env.MUGTEE_PRO_LIMIT_GENERATIONS,
      DEFAULT_PRO_LIMITS.generations
    ),
    exports: parseLimit(process.env.MUGTEE_PRO_LIMIT_EXPORTS, DEFAULT_PRO_LIMITS.exports),
    renders: parseLimit(process.env.MUGTEE_PRO_LIMIT_RENDERS, DEFAULT_PRO_LIMITS.renders),
  }
}

/** Studio tier — Runway / cinematic credits (env: MUGTEE_STUDIO_LIMIT_*). */
export function getStudioPlanLimits(): PlanLimits {
  return {
    projects: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_PROJECTS,
      DEFAULT_STUDIO_LIMITS.projects
    ),
    generations: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_GENERATIONS,
      DEFAULT_STUDIO_LIMITS.generations
    ),
    exports: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_EXPORTS,
      DEFAULT_STUDIO_LIMITS.exports
    ),
    renders: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_RENDERS,
      DEFAULT_STUDIO_LIMITS.renders
    ),
  }
}

export function getPlanLimitsForType(planType: string): PlanLimits {
  const normalized = String(planType || 'FREE').toUpperCase()
  if (normalized === 'STUDIO' || normalized === 'AGENCY') return getStudioPlanLimits()
  if (normalized === 'PRO' || normalized === 'PRO_TRIAL') return getProPlanLimits()
  if (normalized === 'CREATOR') return getCreatorPlanLimits()
  return getFreePlanLimits()
}

export function formatLimitValue(n: number): string {
  return Number.isFinite(n) && n >= 999999 ? 'Unlimited' : String(n)
}

/** Only legacy env bypass — paid tiers use explicit limits for margin protection. */
export function isUnlimitedPlan(planType: string, trialEndsAt: string | null | undefined): boolean {
  if (process.env.MUGTEE_UNLIMITED_PRO === 'true' && planType === 'PRO') return true
  if (planType === 'PRO_TRIAL' && trialEndsAt) {
    return new Date(trialEndsAt) > new Date()
  }
  return false
}

export type ReferralLimitContext = {
  referralBonusGenerations?: number
  referralCreatorPlanBonus?: boolean
}

export function limitForMetric(
  metric: UsageMetric,
  planType: string,
  trialEndsAt: string | null | undefined,
  referral?: ReferralLimitContext
): number {
  if (isUnlimitedPlan(planType, trialEndsAt)) return Infinity

  let base = getPlanLimitsForType(planType)[metric]

  if (referral?.referralCreatorPlanBonus && metric === 'generations') {
    base = Math.max(base, getReferralCreatorPlanGenerationCap())
  }

  if (metric === 'generations' && referral?.referralBonusGenerations) {
    base += Math.max(0, referral.referralBonusGenerations)
  }

  return base
}
