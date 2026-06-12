import { hasRunwayApiKey } from '@/lib/ai/runway-video'
import { hasSeedanceApiKey } from '@/lib/video-providers/seedance-client'
import { RunwayProvider } from '@/lib/video-providers/runway-provider'
import { SeedanceProvider } from '@/lib/video-providers/seedance-provider'
import type { VideoProvider, VideoProviderId } from '@/lib/video-providers/types'
import { normalizeGenerationMode, type GenerationMode } from '@/lib/economics/generation-mode'
import { resolveProviderRouting } from '@/lib/economics/provider-routing.server'

export type SceneVideoGateInput = {
  generationMode?: unknown
  planType?: string | null
}

/** Scene-level AI clip generation — Studio + Cinematic mode only (margin protection). */
export function isSceneVideoGenerationEnabled(input?: SceneVideoGateInput): boolean {
  if (process.env.VIDEO_GENERATION_ENABLED === 'false') return false

  const mode = normalizeGenerationMode(input?.generationMode)
  const policy = resolveProviderRouting({
    generationMode: mode,
    planType: input?.planType,
  })

  if (!policy.sceneVideo) return false

  if (process.env.VIDEO_GENERATION_ENABLED === 'true') {
    return hasRunwayApiKey() || hasSeedanceApiKey()
  }
  return hasRunwayApiKey() || hasSeedanceApiKey()
}

export function resolveSceneVideoProviderId(input?: SceneVideoGateInput): VideoProviderId | null {
  if (!isSceneVideoGenerationEnabled(input)) return null

  const forced = process.env.VIDEO_GENERATION_PROVIDER?.trim().toLowerCase()
  if (forced === 'runway' && hasRunwayApiKey()) return 'runway'
  if (forced === 'seedance' && hasSeedanceApiKey()) return 'seedance'
  if (hasRunwayApiKey()) return 'runway'
  if (hasSeedanceApiKey()) return 'seedance'
  return null
}

export function getVideoProvider(
  id?: VideoProviderId | null,
  gate?: SceneVideoGateInput
): VideoProvider | null {
  const providerId = id ?? resolveSceneVideoProviderId(gate)
  if (!providerId) return null

  switch (providerId) {
    case 'runway':
      return new RunwayProvider()
    case 'seedance':
      return new SeedanceProvider()
    default:
      return null
  }
}

export type { GenerationMode }
