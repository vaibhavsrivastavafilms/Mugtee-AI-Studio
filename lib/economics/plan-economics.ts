import type { PlanLimits } from '@/lib/billing/plan-limits'

/** Normalized subscription tier for economics routing. */
export type MugteePlanTier = 'FREE' | 'CREATOR' | 'PRO' | 'STUDIO' | 'PRO_TRIAL'

export function normalizePlanTier(planType: string | null | undefined): MugteePlanTier {
  const v = String(planType ?? 'FREE').toUpperCase()
  if (v === 'CREATOR') return 'CREATOR'
  if (v === 'PRO') return 'PRO'
  if (v === 'STUDIO' || v === 'AGENCY') return 'STUDIO'
  if (v === 'PRO_TRIAL') return 'PRO_TRIAL'
  return 'FREE'
}

/** Launch pricing labels (INR). */
export const PLAN_PRICE_INR: Record<MugteePlanTier, number> = {
  FREE: 0,
  CREATOR: 999,
  PRO: 2499,
  STUDIO: 4999,
  PRO_TRIAL: 0,
}

const DEFAULT_FREE: PlanLimits = {
  projects: 5,
  generations: 5,
  exports: 1,
  renders: 1,
}

const DEFAULT_CREATOR: PlanLimits = {
  projects: 25,
  generations: 30,
  exports: 5,
  renders: 5,
}

const DEFAULT_PRO: PlanLimits = {
  projects: 100,
  generations: 100,
  exports: 20,
  renders: 20,
}

const DEFAULT_STUDIO: PlanLimits = {
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

export function getEconomicsFreeLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_LIMIT_PROJECTS, DEFAULT_FREE.projects),
    generations: parseLimit(process.env.MUGTEE_LIMIT_GENERATIONS, DEFAULT_FREE.generations),
    exports: parseLimit(process.env.MUGTEE_LIMIT_EXPORTS, DEFAULT_FREE.exports),
    renders: parseLimit(process.env.MUGTEE_LIMIT_RENDERS, DEFAULT_FREE.renders),
  }
}

export function getEconomicsCreatorLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_CREATOR_LIMIT_PROJECTS, DEFAULT_CREATOR.projects),
    generations: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_GENERATIONS,
      DEFAULT_CREATOR.generations
    ),
    exports: parseLimit(process.env.MUGTEE_CREATOR_LIMIT_EXPORTS, DEFAULT_CREATOR.exports),
    renders: parseLimit(
      process.env.MUGTEE_CREATOR_LIMIT_RENDERS,
      DEFAULT_CREATOR.renders
    ),
  }
}

export function getEconomicsProLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_PRO_LIMIT_PROJECTS, DEFAULT_PRO.projects),
    generations: parseLimit(process.env.MUGTEE_PRO_LIMIT_GENERATIONS, DEFAULT_PRO.generations),
    exports: parseLimit(process.env.MUGTEE_PRO_LIMIT_EXPORTS, DEFAULT_PRO.exports),
    renders: parseLimit(process.env.MUGTEE_PRO_LIMIT_RENDERS, DEFAULT_PRO.renders),
  }
}

export function getEconomicsStudioLimits(): PlanLimits {
  return {
    projects: parseLimit(process.env.MUGTEE_STUDIO_LIMIT_PROJECTS, DEFAULT_STUDIO.projects),
    generations: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_GENERATIONS,
      DEFAULT_STUDIO.generations
    ),
    exports: parseLimit(process.env.MUGTEE_STUDIO_LIMIT_EXPORTS, DEFAULT_STUDIO.exports),
    renders: parseLimit(
      process.env.MUGTEE_STUDIO_LIMIT_RENDERS,
      DEFAULT_STUDIO.renders
    ),
  }
}

export function limitsForPlanTier(tier: MugteePlanTier): PlanLimits {
  switch (tier) {
    case 'CREATOR':
      return getEconomicsCreatorLimits()
    case 'PRO':
    case 'PRO_TRIAL':
      return getEconomicsProLimits()
    case 'STUDIO':
      return getEconomicsStudioLimits()
    default:
      return getEconomicsFreeLimits()
  }
}

/** ElevenLabs only on Pro+ (and cinematic mode). Free/Creator use OpenAI TTS. */
export function planAllowsElevenLabs(tier: MugteePlanTier): boolean {
  return tier === 'PRO' || tier === 'PRO_TRIAL' || tier === 'STUDIO'
}

/** Runway / Seedance scene clips — Studio tier + cinematic mode only. */
export function planAllowsSceneVideo(tier: MugteePlanTier): boolean {
  return tier === 'STUDIO'
}

/** Active trial gets Pro limits but not unlimited bypass. */
export function isTrialPlan(tier: MugteePlanTier, trialEndsAt: string | null | undefined): boolean {
  return tier === 'PRO_TRIAL' && !!trialEndsAt && new Date(trialEndsAt) > new Date()
}
