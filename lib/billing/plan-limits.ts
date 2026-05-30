/** Admin-configurable FREE plan caps (Phase 2.8). PRO / active PRO_TRIAL are unlimited. */

export type UsageMetric = 'projects' | 'generations' | 'exports' | 'renders'

export type PlanLimits = Record<UsageMetric, number>

const DEFAULT_LIMITS: PlanLimits = {
  projects: 5,
  generations: 20,
  exports: 3,
  renders: 3,
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
