import 'server-only'

import type { GenerationMode } from '@/lib/economics/generation-mode'
import { normalizeGenerationMode } from '@/lib/economics/generation-mode'
import {
  limitsForPlanTier,
  normalizePlanTier,
  planAllowsElevenLabs,
  planAllowsSceneVideo,
  type MugteePlanTier,
} from '@/lib/economics/plan-economics'

export type ImageProviderTier = 'draft' | 'openai' | 'flux'

export type ResearchPolicy = 'disabled' | 'cache_only' | 'live'

export type VoiceProviderPolicy = 'openai_tts' | 'elevenlabs'

export type ProviderRoutingPolicy = {
  mode: GenerationMode
  planTier: MugteePlanTier
  research: ResearchPolicy
  image: ImageProviderTier
  voice: VoiceProviderPolicy
  sceneVideo: boolean
}

export function resolveProviderRouting(input: {
  generationMode?: unknown
  planType?: string | null
}): ProviderRoutingPolicy {
  const mode = normalizeGenerationMode(input.generationMode)
  const planTier = normalizePlanTier(input.planType)

  const research: ResearchPolicy =
    mode === 'draft'
      ? 'disabled'
      : mode === 'creator'
        ? 'cache_only'
        : 'live'

  const image: ImageProviderTier =
    mode === 'draft' ? 'draft' : 'openai'

  let voice: VoiceProviderPolicy = 'openai_tts'
  if (planAllowsElevenLabs(planTier)) {
    voice = 'elevenlabs'
  }

  const sceneVideo = mode === 'cinematic' && planAllowsSceneVideo(planTier)

  return { mode, planTier, research, image, voice, sceneVideo }
}

export function shouldUseElevenLabsVoice(policy: ProviderRoutingPolicy): boolean {
  return policy.voice === 'elevenlabs'
}

export function shouldRunLivePerplexityResearch(
  policy: ProviderRoutingPolicy,
  topicChanged: boolean
): boolean {
  if (policy.research === 'disabled') return false
  if (policy.research === 'live') return true
  return topicChanged
}

export function shouldUseResearchCache(policy: ProviderRoutingPolicy): boolean {
  return policy.research === 'cache_only' || policy.research === 'live'
}

export function isSceneVideoAllowed(policy: ProviderRoutingPolicy): boolean {
  return policy.sceneVideo
}

export { limitsForPlanTier, normalizePlanTier, planAllowsElevenLabs, planAllowsSceneVideo }
