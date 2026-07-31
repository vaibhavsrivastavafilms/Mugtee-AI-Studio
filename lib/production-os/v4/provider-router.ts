/**
 * Modular AI Provider Router — never hardcode a single video provider.
 * Official integrations only; automatic fallback to next compatible adapter.
 */

import { hasRunwayApiKey } from '@/lib/ai/runway-video'
import { hasSeedanceApiKey } from '@/lib/video-providers/seedance-client'
import type { SceneBlueprintInput, VideoResult } from '@/lib/video-providers/types'
import { getVideoProvider } from '@/lib/video-providers/factory'

export type CompanionVideoProviderId =
  | 'runway'
  | 'seedance'
  | 'google_veo'
  | 'luma'
  | 'kling'
  | 'pika'
  | 'minimax'
  | 'remotion_cinematic'

export type ProviderCapability = {
  id: CompanionVideoProviderId
  label: string
  textToVideo: boolean
  imageToVideo: boolean
  maxDurationSec: number
  resolutions: string[]
  aspectRatios: string[]
  /** Relative speed score (higher = faster). */
  speed: number
  /** Relative cost score (higher = more expensive). */
  cost: number
  available: boolean
}

export type ProviderAdapter = ProviderCapability & {
  generate?(scene: SceneBlueprintInput): Promise<VideoResult>
}

function envFlag(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

/** Capability registry — adapters declare what they can do; router picks first available. */
export function listVideoProviderAdapters(): ProviderAdapter[] {
  return [
    {
      id: 'runway',
      label: 'Runway',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 10,
      resolutions: ['1280x768', '768x1280'],
      aspectRatios: ['16:9', '9:16'],
      speed: 7,
      cost: 8,
      available: hasRunwayApiKey(),
      async generate(scene) {
        const provider = getVideoProvider('runway')
        if (!provider) throw new Error('Runway unavailable')
        return provider.generateVideo(scene)
      },
    },
    {
      id: 'seedance',
      label: 'Seedance',
      textToVideo: false,
      imageToVideo: true,
      maxDurationSec: 8,
      resolutions: ['1080x1920', '1920x1080'],
      aspectRatios: ['9:16', '16:9'],
      speed: 6,
      cost: 5,
      available: hasSeedanceApiKey(),
      async generate(scene) {
        const provider = getVideoProvider('seedance')
        if (!provider) throw new Error('Seedance unavailable')
        return provider.generateVideo(scene)
      },
    },
    {
      id: 'google_veo',
      label: 'Google Veo',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 8,
      resolutions: ['1080p', '4k'],
      aspectRatios: ['16:9', '9:16'],
      speed: 5,
      cost: 9,
      available: envFlag('GOOGLE_VEO_API_KEY') || envFlag('VEO_API_KEY'),
    },
    {
      id: 'luma',
      label: 'Luma Dream Machine',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 5,
      resolutions: ['1280x720'],
      aspectRatios: ['16:9', '9:16'],
      speed: 6,
      cost: 7,
      available: envFlag('LUMA_API_KEY'),
    },
    {
      id: 'kling',
      label: 'Kling',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 10,
      resolutions: ['1080p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      speed: 5,
      cost: 6,
      available: envFlag('KLING_API_KEY'),
    },
    {
      id: 'pika',
      label: 'Pika',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 4,
      resolutions: ['1080p'],
      aspectRatios: ['16:9', '9:16'],
      speed: 7,
      cost: 6,
      available: envFlag('PIKA_API_KEY'),
    },
    {
      id: 'minimax',
      label: 'MiniMax / Hailuo',
      textToVideo: true,
      imageToVideo: true,
      maxDurationSec: 6,
      resolutions: ['1080p'],
      aspectRatios: ['16:9', '9:16'],
      speed: 6,
      cost: 5,
      available: envFlag('MINIMAX_API_KEY') || envFlag('HAILUO_API_KEY'),
    },
    {
      id: 'remotion_cinematic',
      label: 'Mugtee Cinematic Motion',
      textToVideo: false,
      imageToVideo: true,
      maxDurationSec: 180,
      resolutions: ['1080x1920', '1920x1080', '1080x1080'],
      aspectRatios: ['9:16', '16:9', '1:1'],
      speed: 9,
      cost: 1,
      // Always available — Camera Director + Remotion (never a dead end)
      available: true,
    },
  ]
}

export type RouteVideoRequest = {
  preferImageToVideo?: boolean
  preferTextToVideo?: boolean
  maxDurationSec?: number
  aspectRatio?: string
  /** Prefer lower cost when true. */
  preferEconomy?: boolean
}

/** Pick ordered adapters that match the request and are available. */
export function routeVideoProviders(request: RouteVideoRequest = {}): ProviderAdapter[] {
  const all = listVideoProviderAdapters().filter((a) => a.available)

  const scored = all
    .filter((a) => {
      if (request.preferImageToVideo && !a.imageToVideo) return false
      if (request.preferTextToVideo && !a.textToVideo) return false
      if (
        request.maxDurationSec &&
        a.id !== 'remotion_cinematic' &&
        a.maxDurationSec < Math.min(request.maxDurationSec, 10)
      ) {
        return false
      }
      if (request.aspectRatio && !a.aspectRatios.includes(request.aspectRatio)) {
        // Remotion supports all — keep it
        return a.id === 'remotion_cinematic'
      }
      return true
    })
    .sort((a, b) => {
      if (request.preferEconomy) return a.cost - b.cost || b.speed - a.speed
      // Prefer dedicated AI clip providers before Remotion fallback
      if (a.id === 'remotion_cinematic') return 1
      if (b.id === 'remotion_cinematic') return -1
      return b.speed - a.speed || a.cost - b.cost
    })

  return scored.length ? scored : listVideoProviderAdapters().filter((a) => a.id === 'remotion_cinematic')
}

/**
 * Generate a scene clip via the first healthy adapter, falling back automatically.
 * Remotion cinematic is the final non-failing path (returns null → caller uses Camera Director).
 */
export async function generateSceneWithRouter(
  scene: SceneBlueprintInput,
  request?: RouteVideoRequest
): Promise<{ result: VideoResult | null; providerId: CompanionVideoProviderId; attempts: string[] }> {
  const chain = routeVideoProviders({
    preferImageToVideo: Boolean(scene.imageUrl),
    preferTextToVideo: !scene.imageUrl,
    ...request,
  })
  const attempts: string[] = []

  for (const adapter of chain) {
    attempts.push(adapter.id)
    if (adapter.id === 'remotion_cinematic') {
      return { result: null, providerId: 'remotion_cinematic', attempts }
    }
    if (!adapter.generate) continue
    try {
      const result = await adapter.generate(scene)
      if (result?.videoUrl) {
        return { result, providerId: adapter.id, attempts }
      }
    } catch {
      // Official fallback — try next adapter
      continue
    }
  }

  return { result: null, providerId: 'remotion_cinematic', attempts }
}
