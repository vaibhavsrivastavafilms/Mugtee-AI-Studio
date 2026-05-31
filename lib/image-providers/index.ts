import 'server-only'

import { generateTogetherImage, hasTogetherApiKey } from '@/lib/image-providers/together'
import { getPollinationsImageUrl } from '@/lib/image-providers/pollinations'

export type ImageProviderName = 'together' | 'pollinations'

export type GenerateImageResult = {
  url: string
  provider: ImageProviderName
}

/** Try Together AI first, then Pollinations. Returns null when both fail. */
export async function generateImage(prompt: string): Promise<GenerateImageResult | null> {
  const trimmed = prompt.trim()
  if (!trimmed) return null

  console.log('[IMAGE_PROVIDER] Starting image generation')

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

export { hasTogetherApiKey } from '@/lib/image-providers/together'
