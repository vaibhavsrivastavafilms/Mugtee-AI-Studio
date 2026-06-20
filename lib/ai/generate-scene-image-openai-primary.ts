import 'server-only'

import {
  allowDalleImages,
} from '@/lib/ai/free-tier'
import {
  generateOpenAISceneImage,
  generateSceneImage,
  type SceneImageOptions,
  type SceneImagePersistContext,
} from '@/lib/ai/generate-scene-image'
import { generateImage, generateDraftImage } from '@/lib/image-providers'
import type { ImageProviderTier } from '@/lib/economics/provider-routing.server'
import { persistRemoteStoryboardImage } from '@/lib/storage/persist-storyboard-image.server'

const OPENAI_IMAGE_CONCURRENCY = 3

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
  imageTier?: ImageProviderTier
  persist?: SceneImagePersistContext
}

export async function generateSceneImageOpenAIPrimary(
  prompt: string,
  opts: PrimaryImageOpts = {}
): Promise<{
  url: string | null
  provider?: string
  assetPath?: string
  imageAssetId?: string
  thumbnailUrl?: string
}> {
  const trimmed = prompt.trim()
  if (!trimmed) return { url: null }

  async function persistProviderUrl(
    remoteUrl: string,
    provider: string
  ): Promise<{
    url: string
    provider: string
    assetPath?: string
    imageAssetId?: string
    thumbnailUrl?: string
  }> {
    if (opts.persist) {
      const result = await persistRemoteStoryboardImage({
        remoteUrl,
        userId: opts.persist.userId,
        projectId: opts.persist.projectId,
        sceneId: opts.persist.sceneId,
        previousAssetId: opts.persist.previousAssetId,
        prompt: opts.persist.prompt,
        title: opts.persist.title,
        sequenceIndex: opts.persist.sequenceIndex,
        metadata: { source: 'openai-primary', provider },
      })
      return {
        url: result.imageUrl,
        provider,
        assetPath: result.imageAssetPath,
        imageAssetId: result.imageAssetId,
        thumbnailUrl: result.thumbnailUrl,
      }
    }
    const { persistRemoteImage } = await import('@/lib/ai/generate-scene-image')
    const { extractStoragePathFromUrl } = await import('@/lib/storyboard/storyboard-asset')
    const filename =
      opts.filename ??
      (opts.userId
        ? `${opts.userId}/cinematic/auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
        : undefined)
    if (!filename) {
      return { url: remoteUrl, provider }
    }
    const url = await persistRemoteImage({
      remoteUrl,
      userId: opts.userId,
      filename,
    })
    return {
      url,
      provider,
      assetPath: extractStoragePathFromUrl(url) ?? filename,
    }
  }

  if (opts.imageTier === 'draft') {
    const draft = await generateDraftImage(trimmed)
    if (!draft) return { url: null }
    const persisted = await persistProviderUrl(draft.url, draft.provider)
    return persisted
  }

  if (allowDalleImages()) {
    const remoteUrl = await generateOpenAISceneImage(trimmed, opts.imageOptions)
    if (remoteUrl) {
      return persistProviderUrl(remoteUrl, 'openai')
    }
  }

  if (opts.persist) {
    return generateSceneImage(trimmed, {
      userId: opts.userId,
      hasReferenceStyle: opts.hasReferenceStyle,
      aspectRatio: opts.aspectRatio,
      persist: opts.persist,
    })
  }

  if (opts.filename) {
    return generateSceneImage(trimmed, {
      filename: opts.filename,
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
