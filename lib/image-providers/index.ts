import 'server-only'

import { generateFluxApiImage, hasFluxApiKey } from '@/lib/image-providers/fluxapi'
import { generateTogetherImage, hasTogetherApiKey } from '@/lib/image-providers/together'
import { getPollinationsImageUrl } from '@/lib/image-providers/pollinations'

export type ImageProviderName = 'fluxapi' | 'together' | 'pollinations'

export type GenerateImageOptions = {
  /** Flux Kontext aspect ratio — e.g. `9:16` reels, `16:9` landscape */
  aspectRatio?: string
  /** Flux Kontext model — `flux-kontext-pro` or `flux-kontext-max` */
  model?: string
}

export type GenerateImageResult = {
  url: string
  provider: ImageProviderName
}

/** Try FluxAPI Kontext, then Together AI, then Pollinations. Returns null when all fail. */
export async function generateImage(
  prompt: string,
  options?: GenerateImageOptions
): Promise<GenerateImageResult | null> {
  const trimmed = prompt.trim()
  if (!trimmed) return null

  console.log('[IMAGE_PROVIDER] Starting image generation')

  if (hasFluxApiKey()) {
    console.log('[IMAGE_PROVIDER] Trying FluxAPI.ai (Kontext)')
    const url = await generateFluxApiImage(trimmed, {
      aspectRatio: options?.aspectRatio,
      model: options?.model,
    })
    if (url) {
      console.log('[IMAGE_SUCCESS] fluxapi')
      return { url, provider: 'fluxapi' }
    }
    console.log('[IMAGE_FALLBACK] together/pollinations after fluxapi')
  }

  if (hasTogetherApiKey()) {
    console.log('[IMAGE_PROVIDER] Trying Together AI (FLUX.1-schnell)')
    const url = await generateTogetherImage(trimmed)
    if (url) {
      console.log('[IMAGE_SUCCESS] together')
      return { url, provider: 'together' }
    }
    console.log('[IMAGE_FALLBACK] pollinations')
  } else {
    console.log('[IMAGE_PROVIDER] No Together key — using Pollinations')
  }

  try {
    const url = getPollinationsImageUrl(trimmed)
    console.log('[IMAGE_SUCCESS] pollinations')
    return { url, provider: 'pollinations' }
  } catch (err) {
    console.error('[IMAGE_ERROR] pollinations', err)
    return null
  }
}

export { hasFluxApiKey } from '@/lib/image-providers/fluxapi'
export { hasTogetherApiKey } from '@/lib/image-providers/together'
