import 'server-only'

import { generateFluxApiImage, hasFluxApiKey } from '@/lib/image-providers/fluxapi'
import { generateTogetherImage, hasTogetherApiKey } from '@/lib/image-providers/together'
import { fetchPollinationsImageDataUrl } from '@/lib/image-providers/pollinations'
import { generateComfyUiImage, hasComfyUiUrl } from '@/lib/image-providers/comfyui'
import { generateSdxlImage, hasSdxlApiKey } from '@/lib/image-providers/sdxl'
import { generateGeminiSceneImageBuffer } from '@/lib/ai/gemini-image'
import { hasDirectGeminiKey } from '@/lib/ai/free-tier'

export type ImageProviderName =
  | 'fluxapi'
  | 'comfyui'
  | 'sdxl'
  | 'together'
  | 'gemini'
  | 'pollinations'

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

async function generateGeminiImage(prompt: string): Promise<GenerateImageResult | null> {
  if (!hasDirectGeminiKey()) return null
  console.log('[IMAGE_PROVIDER] Trying Gemini image')
  try {
    const result = await generateGeminiSceneImageBuffer(prompt)
    if (!result?.buffer && !result?.b64) return null
    const b64 = result.b64 ?? result.buffer!.toString('base64')
    console.log('[IMAGE_SUCCESS] gemini')
    return { url: `data:image/png;base64,${b64}`, provider: 'gemini' }
  } catch (err) {
    console.error('[IMAGE_ERROR] gemini', err)
    return null
  }
}

/** Draft mode — Together → Gemini → verified Pollinations. */
export async function generateDraftImage(
  prompt: string
): Promise<GenerateImageResult | null> {
  const trimmed = prompt.trim()
  if (!trimmed) return null

  if (hasTogetherApiKey()) {
    const url = await generateTogetherImage(trimmed)
    if (url) return { url, provider: 'together' }
  }

  const gemini = await generateGeminiImage(trimmed)
  if (gemini) return gemini

  const pollinations = await fetchPollinationsImageDataUrl(trimmed)
  if (pollinations) return { url: pollinations, provider: 'pollinations' }

  return null
}

/**
 * Provider order: FluxAPI → ComfyUI (local) → SDXL → Together FLUX → Gemini → Pollinations.
 * Returns null only when every provider fails.
 */
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
    console.log('[IMAGE_FALLBACK] comfyui/sdxl/together/gemini/pollinations after fluxapi')
  }

  if (hasComfyUiUrl()) {
    console.log('[IMAGE_PROVIDER] Trying ComfyUI (local SDXL workflow)')
    const url = await generateComfyUiImage({
      prompt: trimmed,
      negativePrompt: 'blurry, low quality, watermark, text',
      width: 768,
      height: 1344,
      seed: Math.floor(Math.random() * 1_000_000),
    })
    if (url) {
      console.log('[IMAGE_SUCCESS] comfyui')
      return { url, provider: 'comfyui' }
    }
    console.log('[IMAGE_FALLBACK] sdxl/together/gemini/pollinations after comfyui')
  }

  if (hasSdxlApiKey()) {
    console.log('[IMAGE_PROVIDER] Trying SDXL (Together/Stability)')
    const result = await generateSdxlImage(trimmed, { aspectRatio: options?.aspectRatio })
    if (result?.url) {
      console.log('[IMAGE_SUCCESS] sdxl')
      return { url: result.url, provider: 'sdxl' }
    }
    console.log('[IMAGE_FALLBACK] together/gemini/pollinations after sdxl')
  }

  if (hasTogetherApiKey()) {
    console.log('[IMAGE_PROVIDER] Trying Together AI (FLUX.1-schnell)')
    const url = await generateTogetherImage(trimmed)
    if (url) {
      console.log('[IMAGE_SUCCESS] together')
      return { url, provider: 'together' }
    }
    console.log('[IMAGE_FALLBACK] gemini/pollinations after together')
  }

  const gemini = await generateGeminiImage(trimmed)
  if (gemini) return gemini

  console.log('[IMAGE_PROVIDER] Trying Pollinations (verified fetch)')
  const pollinations = await fetchPollinationsImageDataUrl(trimmed)
  if (pollinations) {
    console.log('[IMAGE_SUCCESS] pollinations')
    return { url: pollinations, provider: 'pollinations' }
  }

  console.error('[IMAGE_ERROR] all providers failed')
  return null
}

export { hasFluxApiKey } from '@/lib/image-providers/fluxapi'
export { hasTogetherApiKey } from '@/lib/image-providers/together'
