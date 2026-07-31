/**
 * AI Creative Companion — one idea in, full production plan out.
 * Orchestration contract (not UI). Engines behind phases remain replaceable.
 */

import {
  PRODUCTION_OS_V4,
  PRODUCTION_OS_V4_MAX_DURATION_SEC,
  PRODUCTION_OS_V4_PHASE_ORDER,
  clampV4DurationSec,
  type ProductionOsV4PhaseId,
} from '@/lib/production-os/v4/pipeline'
import {
  resolveCompanionSeed,
  type CompanionProductionRequest,
} from '@/lib/production-os/v4/input'
import { thinkingForPhase } from '@/lib/production-os/v4/thinking-engine'
import type { CharacterBible } from '@/lib/production-os/v4/character-bible'
import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'
import {
  PRODUCTION_OS_V4_PACKAGE_CATALOG,
  type ProductionOsV4PackageItemId,
} from '@/lib/production-os/v4/export-catalog'

/** Client-safe default chain — live availability is resolved server-side. */
const DEFAULT_VIDEO_PROVIDER_CHAIN = [
  'runway',
  'seedance',
  'google_veo',
  'luma',
  'kling',
  'pika',
  'minimax',
  'remotion_cinematic',
] as const

export type CompanionPhasePlan = {
  id: ProductionOsV4PhaseId
  thinking: string
  status: 'queued' | 'running' | 'completed' | 'skipped'
}

export type CompanionProductionPlan = {
  version: typeof PRODUCTION_OS_V4
  seedText: string
  inputSources: string[]
  durationSec: number
  maxDurationSec: number
  platform: string
  language: string
  phases: CompanionPhasePlan[]
  videoProviderChain: string[]
  exportItems: ProductionOsV4PackageItemId[]
  characterBible: CharacterBible | null
  environmentBible: EnvironmentBible | null
  philosophy: string
}

/** Build the invisible studio run plan from a single creator request. */
export function buildCompanionProductionPlan(
  request: CompanionProductionRequest,
  bibles?: {
    characterBible?: CharacterBible | null
    environmentBible?: EnvironmentBible | null
  }
): CompanionProductionPlan {
  const resolved = resolveCompanionSeed(request)
  const durationSec = clampV4DurationSec(resolved.intent.durationSec ?? 60)

  return {
    version: PRODUCTION_OS_V4,
    seedText: resolved.seedText,
    inputSources: resolved.sources,
    durationSec,
    maxDurationSec: PRODUCTION_OS_V4_MAX_DURATION_SEC,
    platform: resolved.intent.platform ?? 'youtube_short',
    language: resolved.intent.language ?? 'en',
    phases: PRODUCTION_OS_V4_PHASE_ORDER.map((id) => ({
      id,
      thinking: thinkingForPhase(id, 'queued'),
      status: 'queued' as const,
    })),
    videoProviderChain: [...DEFAULT_VIDEO_PROVIDER_CHAIN],
    exportItems: PRODUCTION_OS_V4_PACKAGE_CATALOG.filter((i) => i.available).map(
      (i) => i.id
    ),
    characterBible: bibles?.characterBible ?? null,
    environmentBible: bibles?.environmentBible ?? null,
    philosophy:
      'The creator brings the idea. Mugtee is the invisible production studio.',
  }
}
