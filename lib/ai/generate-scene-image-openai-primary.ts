import 'server-only'

import {
  allowDalleImages,
} from '@/lib/ai/free-tier'
import {
  generateOpenAISceneImage,
  generateSceneImage,
  persistRemoteImage,
  type SceneImageOptions,
} from '@/lib/ai/generate-scene-image'
import { generateImage, generateDraftImage } from '@/lib/image-providers'
import type { ImageProviderTier } from '@/lib/economics/provider-routing.server'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'

const OPENAI_IMAGE_CONCURRENCY = 3

/** Bounded parallel map — keeps OpenAI rate limits sane while speeding multi-scene batches. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length < 1) return []
  const results = new Array<R>(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export { OPENAI_IMAGE_CONCURRENCY }

type PrimaryImageOpts = {
  filename?: string
  userId?: string
  hasReferenceStyle?: boolean
  aspectRatio?: string
  imageOptions?: SceneImageOptions
  /** Economics routing — draft skips paid image APIs. */
  imageTier?: ImageProviderTier
}

/**
 * Storyboard still: OpenAI Images (gpt-image-1 / dall-e) when OPENAI_API_KEY is set,
 * then Flux/Together/Pollinations. Persists to Supabase when filename is provided.
 */
export async function generateSceneImageOpenAIPrimary(
  prompt: string,
  opts: PrimaryImageOpts = {}
): Promise<{ url: string | null; provider?: string; assetPath?: string }> {
  const trimmed = prompt.trim()
  if (!trimmed) return { url: null }

  const filename =
    opts.filename ??
    (opts.userId
      ? `${opts.userId}/cinematic/auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
      : undefined)

  if (opts.imageTier === 'draft') {
    const draft = await generateDraftImage(trimmed)
    if (!draft) return { url: null }
    if (filename) {
      const uploaded = await persistRemoteImage({
        remoteUrl: draft.url,
        userId: opts.userId,
        filename,
      })
      const assetPath =
        extractStoragePathFromUrl(uploaded) ??
        (uploaded.includes('/project-assets/') ? filename : undefined)
      return { url: uploaded, provider: draft.provider, assetPath }
    }
    return { url: draft.url, provider: draft.provider }
  }

  if (allowDalleImages()) {
    const remoteUrl = await generateOpenAISceneImage(trimmed, opts.imageOptions)
    if (remoteUrl && filename) {
      const uploaded = await persistRemoteImage({
        remoteUrl,
        userId: opts.userId,
        filename,
      })
      const assetPath =
        extractStoragePathFromUrl(uploaded) ??
        (uploaded.includes('/project-assets/') ? filename : undefined)
      if (assetPath && !isEphemeralRemoteImageUrl(uploaded)) {
        return { url: uploaded, provider: 'openai', assetPath }
      }
      return { url: uploaded, provider: 'openai', assetPath }
    }
    if (remoteUrl) {
      return { url: remoteUrl, provider: 'openai' }
    }
  }

  if (filename) {
    return generateSceneImage(trimmed, {
      filename,
      userId: opts.userId,
      hasReferenceStyle: opts.hasReferenceStyle,
      aspectRatio: opts.aspectRatio,
    })
  }

  const fallback = await generateImage(trimmed, {
    aspectRatio: opts.aspectRatio ?? process.env.FLUXAPI_ASPECT_RATIO?.trim() ?? '9:16',
  })
  if (!fallback) return { url: null }
  return { url: fallback.url, provider: fallback.provider }
}
