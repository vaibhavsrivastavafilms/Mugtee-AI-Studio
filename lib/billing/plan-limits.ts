/** Admin-configurable plan caps (Phase 2.8 + Phase 4 monetization validation). */

export type UsageMetric = 'projects' | 'generations' | 'exports' | 'renders'

export type PlanLimits = Record<UsageMetric, number>

export type PaidPlanTier = 'CREATOR' | 'PRO'

const DEFAULT_LIMITS: PlanLimits = {
  projects: 5,
  generations: 20,
  exports: 3,
  renders: 3,
}

const DEFAULT_CREATOR_LIMITS: PlanLimits = {
  projects: 25,
  generations: 100,
  exports: 15,
  renders: 15,
}

const DEFAULT_PRO_LIMITS: PlanLimits = {
  projects: 100,
  generations: 500,
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

export function formatLimitValue(n: number): string {
  return Number.isFinite(n) && n >= 999999 ? 'Unlimited' : String(n)
}

export function isUnlimitedPlan(planType: string, trialEndsAt: string | null | undefined): boolean {
  if (planType === 'PRO') return true
  if (planType === 'PRO_TRIAL' && trialEndsAt) {
    return new Date(trialEndsAt) > new Date()
  }
  return false
}

export function limitForMetric(
  metric: UsageMetric,
  planType: string,
  trialEndsAt: string | null | undefined
): number {
  if (isUnlimitedPlan(planType, trialEndsAt)) return Infinity
  return getFreePlanLimits()[metric]
}
