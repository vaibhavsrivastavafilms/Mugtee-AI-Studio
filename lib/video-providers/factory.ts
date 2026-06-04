import { hasRunwayApiKey } from '@/lib/ai/runway-video'
import { hasSeedanceApiKey } from '@/lib/video-providers/seedance-client'
import { RunwayProvider } from '@/lib/video-providers/runway-provider'
import { SeedanceProvider } from '@/lib/video-providers/seedance-provider'
import type { VideoProvider, VideoProviderId } from '@/lib/video-providers/types'

/** Scene-level AI clip generation — distinct from final MP4 compile (VIDEO_RENDER_ENABLED). */
export function isSceneVideoGenerationEnabled(): boolean {
  if (process.env.VIDEO_GENERATION_ENABLED === 'false') return false
  if (process.env.VIDEO_GENERATION_ENABLED === 'true') {
    return hasRunwayApiKey() || hasSeedanceApiKey()
  }
  return hasRunwayApiKey() || hasSeedanceApiKey()
}

export function resolveSceneVideoProviderId(): VideoProviderId | null {
  if (!isSceneVideoGenerationEnabled()) return null

  const forced = process.env.VIDEO_GENERATION_PROVIDER?.trim().toLowerCase()
  if (forced === 'runway' && hasRunwayApiKey()) return 'runway'
  if (forced === 'seedance' && hasSeedanceApiKey()) return 'seedance'
  if (hasRunwayApiKey()) return 'runway'
  if (hasSeedanceApiKey()) return 'seedance'
  return null
}

export function getVideoProvider(id?: VideoProviderId | null): VideoProvider | null {
  const providerId = id ?? resolveSceneVideoProviderId()
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
