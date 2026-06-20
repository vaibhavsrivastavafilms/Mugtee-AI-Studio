import { generateImage, hasTogetherApiKey } from '@/lib/image-providers'
import {
  allowDalleImages,
  allowReplicateImages,
  FREE_OPENAI_IMAGE_MODEL,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { logError } from '@/lib/workspace/validation'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { uploadStoryboardBuffer } from '@/lib/storage/storage-upload.server'
import { StorageUploadError } from '@/lib/storage/errors'

/**
 * Storyboard images: set OPENAI_API_KEY (optional OPENAI_IMAGE_MODEL=gpt-image-1).
 * Fallback chain after OpenAI: FluxAPI / Together / Pollinations (no key).
 */
export function hasImageGenerationKey(): boolean {
  return true
}

export { hasTogetherApiKey }

export type SceneImageOptions = {
  quality?: 'standard' | 'hd'
  size?: '1024x1792' | '1792x1024' | '1024x1024'
  hasReferenceStyle?: boolean
  aspectRatio?: string
}

export type SceneImagePersistContext = {
  userId: string
  projectId: string
  sceneId: string
  previousAssetId?: string | null
  prompt?: string | null
  title?: string | null
  sequenceIndex?: number
}

/** Generate a cinematic still via FluxAPI Kontext → Together → Pollinations. */
export async function generateSceneImage(
  prompt: string,
  opts: {
    filename?: string
    userId?: string
    hasReferenceStyle?: boolean
    aspectRatio?: string
    persist?: SceneImagePersistContext
  } = {}
): Promise<{ url: string | null; provider?: string; assetPath?: string; imageAssetId?: string }> {
  const result = await generateImage(prompt, {
    aspectRatio: opts.aspectRatio ?? process.env.FLUXAPI_ASPECT_RATIO?.trim() ?? '9:16',
  })
  if (!result) return { url: null }

  if (opts.persist) {
    const { persistRemoteStoryboardImage } = await import(
      '@/lib/storage/persist-storyboard-image.server'
    )
    const persisted = await persistRemoteStoryboardImage({
      remoteUrl: result.url,
      userId: opts.persist.userId,
      projectId: opts.persist.projectId,
      sceneId: opts.persist.sceneId,
      previousAssetId: opts.persist.previousAssetId,
      prompt: opts.persist.prompt,
      title: opts.persist.title,
      sequenceIndex: opts.persist.sequenceIndex,
      metadata: { source: 'generate-scene-image', provider: result.provider },
    })
    return {
      url: persisted.imageUrl,
      provider: result.provider,
      assetPath: persisted.imageAssetPath,
      imageAssetId: persisted.imageAssetId,
    }
  }

  const filename =
    opts.filename ??
    (opts.userId
      ? `${opts.userId}/cinematic/auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
      : undefined)

  if (filename && opts.userId) {
    const uploaded = await persistRemoteImage({
      remoteUrl: result.url,
      userId: opts.userId,
      filename,
    })
    const assetPath = extractStoragePathFromUrl(uploaded) ?? filename
    return { url: uploaded, provider: result.provider, assetPath }
  }

  return { url: result.url, provider: result.provider }
}

export function resolveOpenAIImageSize(
  size: SceneImageOptions['size'] = '1024x1792'
): '1024x1024' | '1024x1536' | '1536x1024' | 'auto' {
  switch (size) {
    case '1792x1024':
      return '1536x1024'
    case '1024x1024':
      return '1024x1024'
    case '1024x1792':
    default:
      return '1024x1536'
  }
}

function resolveOpenAIImageQuality(
  quality: SceneImageOptions['quality'] = 'standard',
  model: string
): 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto' | undefined {
  if (model.startsWith('dall-e')) {
    return quality === 'hd' ? 'hd' : 'standard'
  }
  return quality === 'hd' ? 'high' : 'medium'
}

export async function generateOpenAISceneImage(
  prompt: string,
  opts: SceneImageOptions = {}
): Promise<string | null> {
  if (!allowDalleImages()) return null
  const { quality = 'standard', size = '1024x1792' } = opts
  const model = FREE_OPENAI_IMAGE_MODEL
  const resolvedSize = resolveOpenAIImageSize(size)
  const resolvedQuality = resolveOpenAIImageQuality(quality, model)
  try {
    const openai = getOpenAIClient()
    const res = await openai.images.generate({
      model,
      prompt: prompt.slice(0, 3800),
      size: resolvedSize,
      quality: resolvedQuality,
      n: 1,
    })
    const item = res.data?.[0]
    if (item?.url) return item.url
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
    logError('generate-scene-image.openai', new Error('No image in OpenAI response'), { model })
    return null
  } catch (err) {
    logError('generate-scene-image.openai', err, { model, size: resolvedSize })
    return null
  }
}

/** @deprecated Prefer persistStoryboardImage — throws on failure, service role only. */
export async function uploadImageBuffer(params: {
  buffer: Buffer
  filename: string
  contentType?: string
  sceneId?: string
}): Promise<string> {
  const upload = await uploadStoryboardBuffer({
    buffer: params.buffer,
    storagePath: params.filename,
    contentType: params.contentType,
    sceneId: params.sceneId,
  })
  const { createStoryboardSignedUrl } = await import('@/lib/storage/signed-url.server')
  const signed = await createStoryboardSignedUrl(upload.storagePath)
  if (!signed) {
    throw new StorageUploadError({
      message: 'Upload succeeded but signed URL generation failed',
      bucket: upload.bucket,
      path: upload.storagePath,
      bytes: upload.fileSize,
      sceneId: params.sceneId,
    })
  }
  return signed
}

/** Download remote image and upload — throws StorageUploadError on failure (no silent fallback). */
export async function persistRemoteImage(params: {
  remoteUrl: string
  userId?: string
  filename: string
  sceneId?: string
}): Promise<string> {
  const dataMatch = /^data:([^;]+);base64,(.+)$/i.exec(params.remoteUrl)
  let buffer: Buffer
  let contentType = 'image/png'

  if (dataMatch) {
    buffer = Buffer.from(dataMatch[2], 'base64')
    contentType = dataMatch[1]
  } else {
    const isPollinations = /pollinations\.ai/i.test(params.remoteUrl)
    const imgRes = await fetch(params.remoteUrl, {
      signal: AbortSignal.timeout(isPollinations ? 60_000 : 30_000),
    })
    if (!imgRes.ok) {
      throw new StorageUploadError({
        message: `Provider download failed: HTTP ${imgRes.status}`,
        bucket: 'project-assets',
        path: params.filename,
        bytes: 0,
        httpStatus: imgRes.status,
        sceneId: params.sceneId,
      })
    }
    buffer = Buffer.from(await imgRes.arrayBuffer())
    contentType = imgRes.headers.get('content-type') ?? 'image/png'
  }

  return uploadImageBuffer({
    buffer,
    filename: params.filename,
    contentType,
    sceneId: params.sceneId,
  })
}

export function hasPaidImageFallbackKey(): boolean {
  return Boolean(allowDalleImages() || allowReplicateImages())
}
