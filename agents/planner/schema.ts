import { z } from 'zod'

import {
  normalizeProductionPlanning,
  PRODUCTION_DEFAULT_DURATION_SEC,
  PRODUCTION_DURATION_MAX_SEC,
  PRODUCTION_DURATION_MIN_SEC,
  PRODUCTION_SCENE_COUNT_MAX,
  PRODUCTION_SCENE_COUNT_MIN,
} from '@/lib/v7/production-planning'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_LABEL_MAX,
  AI_PLANNING_TITLE_MAX,
  coerceOptionalPlanningString,
  coercePlanningString,
} from '@/lib/v7/creative-planning-validation'

const PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube Shorts',
  'YouTube',
  'LinkedIn',
  'Facebook',
] as const

const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:5'] as const

type Platform = (typeof PLATFORMS)[number]
type AspectRatio = (typeof ASPECT_RATIOS)[number]

const PLATFORM_ALIASES: Record<string, Platform> = {
  instagram: 'Instagram',
  ig: 'Instagram',
  tiktok: 'TikTok',
  'youtube shorts': 'YouTube Shorts',
  shorts: 'YouTube Shorts',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  fb: 'Facebook',
}

function normalizePlatform(value: unknown): Platform {
  if (typeof value !== 'string' || !value.trim()) return 'YouTube Shorts'
  const direct = PLATFORMS.find((p) => p.toLowerCase() === value.trim().toLowerCase())
  if (direct) return direct
  return PLATFORM_ALIASES[value.trim().toLowerCase()] ?? 'YouTube Shorts'
}

function normalizeAspectRatio(value: unknown): AspectRatio {
  if (typeof value !== 'string' || !value.trim()) return '9:16'
  const cleaned = value.trim().replace(/\s+/g, '')
  const direct = ASPECT_RATIOS.find((r) => r === cleaned)
  return direct ?? '9:16'
}

function coerceInt(value: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function coerceBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
  }
  return fallback
}

export const productionPlanSchema = z.object({
  title: z.string().min(1).max(AI_PLANNING_TITLE_MAX),
  duration: z.number().int().min(PRODUCTION_DURATION_MIN_SEC).max(PRODUCTION_DURATION_MAX_SEC),
  platform: z.enum(PLATFORMS),
  language: z.string().min(1).max(AI_PLANNING_LABEL_MAX),
  aspectRatio: z.enum(ASPECT_RATIOS),
  style: z.string().min(1).max(AI_PLANNING_DIRECTION_MAX),
  sceneCount: z.number().int().min(PRODUCTION_SCENE_COUNT_MIN).max(PRODUCTION_SCENE_COUNT_MAX),
  voice: z.string().min(1).max(AI_PLANNING_DIRECTION_MAX),
  music: z.string().min(1).max(AI_PLANNING_DIRECTION_MAX),
  characterConsistency: z.boolean(),
  tone: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
  pacing: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
  targetAudience: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
  brand: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
  location: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
  callToAction: z.string().max(AI_PLANNING_DIRECTION_MAX).optional(),
})

export type ProductionPlanInput = z.infer<typeof productionPlanSchema>

/** Normalize common LLM JSON drift before strict Zod validation. */
export function normalizeProductionPlanRaw(
  raw: Record<string, unknown>,
  userPrompt?: string
): Record<string, unknown> {
  const title = coercePlanningString(raw.title, 'Untitled Production', AI_PLANNING_TITLE_MAX)
  const promptForPlanning = userPrompt?.trim() || title

  const hintedDuration = coerceInt(
    raw.duration,
    0,
    PRODUCTION_DURATION_MIN_SEC,
    PRODUCTION_DURATION_MAX_SEC
  )
  const hintedSceneCount = coerceInt(
    raw.sceneCount ?? raw.scene_count,
    0,
    PRODUCTION_SCENE_COUNT_MIN,
    PRODUCTION_SCENE_COUNT_MAX
  )

  const plan = normalizeProductionPlanning({
    prompt: promptForPlanning,
    duration: hintedDuration > 0 ? hintedDuration : null,
    sceneCount: hintedSceneCount > 0 ? hintedSceneCount : null,
  })

  return {
    title,
    duration: plan.duration,
    platform: normalizePlatform(raw.platform),
    language: coercePlanningString(raw.language, 'English', AI_PLANNING_LABEL_MAX),
    aspectRatio: normalizeAspectRatio(raw.aspectRatio ?? raw.aspect_ratio),
    style: coercePlanningString(raw.style, 'Cinematic', AI_PLANNING_DIRECTION_MAX),
    sceneCount: plan.sceneCount,
    voice: coercePlanningString(raw.voice, 'Warm Narrator', AI_PLANNING_DIRECTION_MAX),
    music: coercePlanningString(raw.music, 'Emotional Cinematic', AI_PLANNING_DIRECTION_MAX),
    characterConsistency: coerceBool(raw.characterConsistency ?? raw.character_consistency),
    tone: coerceOptionalPlanningString(raw.tone, AI_PLANNING_DIRECTION_MAX),
    pacing: coerceOptionalPlanningString(raw.pacing, AI_PLANNING_DIRECTION_MAX),
    targetAudience: coerceOptionalPlanningString(raw.targetAudience, AI_PLANNING_DIRECTION_MAX),
    brand: coerceOptionalPlanningString(raw.brand, AI_PLANNING_DIRECTION_MAX),
    location: coerceOptionalPlanningString(raw.location, AI_PLANNING_DIRECTION_MAX),
    callToAction: coerceOptionalPlanningString(raw.callToAction, AI_PLANNING_DIRECTION_MAX),
  }
}

export function parseProductionPlan(raw: Record<string, unknown>, userPrompt?: string) {
  return productionPlanSchema.parse(normalizeProductionPlanRaw(raw, userPrompt))
}

export { PRODUCTION_DEFAULT_DURATION_SEC }
