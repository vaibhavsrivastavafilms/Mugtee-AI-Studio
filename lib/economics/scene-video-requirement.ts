import { normalizeGenerationMode } from '@/lib/economics/generation-mode'
import { normalizePlanTier, planAllowsSceneVideo } from '@/lib/economics/plan-economics'

/**
 * Single source of truth — when the pipeline must block export until every scene has
 * an AI-generated video clip (`scene.videoUrl`).
 *
 * Quick Cut / Draft / Creator (and Cinematic on non-Studio plans): image-only scenes OK.
 * Cinematic + Studio: per-scene video clips required before MP4 export.
 */
export function pipelineRequiresSceneVideos(input: {
  generationMode?: unknown
  planType?: string | null
}): boolean {
  const mode = normalizeGenerationMode(input.generationMode)
  if (mode !== 'cinematic') return false
  return planAllowsSceneVideo(normalizePlanTier(input.planType))
}
