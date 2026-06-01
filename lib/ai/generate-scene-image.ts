import { generateImage, hasTogetherApiKey } from '@/lib/image-providers'
import {
  allowDalleImages,
  allowReplicateImages,
  FREE_OPENAI_IMAGE_MODEL,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { logError } from '@/lib/workspace/validation'

/** Pollinations fallback requires no key — image generation is always available. */
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

/** Generate a cinematic still via FluxAPI Kontext → Together → Pollinations. Uploads when filename provided. */
export async function generateSceneImage(
  prompt: string,
  opts: {
    filename?: string
    userId?: string
    hasReferenceStyle?: boolean
    aspectRatio?: string
  } = {}
): Promise<{ url: string | null; provider?: string }> {
  const result = await generateImage(prompt, {
    aspectRatio: opts.aspectRatio ?? process.env.FLUXAPI_ASPECT_RATIO?.trim() ?? '9:16',
  })
  if (!result) return { url: null }

  if (opts.filename) {
    const uploaded = await persistRemoteImage({
      remoteUrl: result.url,
      userId: opts.userId,
      filename: opts.filename,
    })
    return { url: uploaded, provider: result.provider }
  }

  return { url: result.url, provider: result.provider }
}

/** Map legacy DALL-E sizes to gpt-image-1 supported sizes. */
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

/** Generate a cinematic still via OpenAI Images API (skipped in free-tier-only mode). */
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
    logError('generate-scene-image.openai', new Error('No image in OpenAI response'), {
      model,
    })
    return null
  } catch (err) {
    logError('generate-scene-image.openai', err, { model, size: resolvedSize })
    return null
  }
}

export async function uploadImageBuffer(params: {
  buffer: Buffer
  filename: string
  contentType?: string
}): Promise<string | null> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { error: upErr } = await supabase.storage
    .from('project-assets')
    .upload(params.filename, params.buffer, {
      contentType: params.contentType ?? 'image/png',
      upsert: false,
    })
  if (upErr) return null
  const { data: pub } = supabase.storage.from('project-assets').getPublicUrl(params.filename)
  return pub.publicUrl
}

/** Download remote image URL and persist to Supabase storage. */
export async function persistRemoteImage(params: {
  remoteUrl: string
  userId?: string
  filename: string
}): Promise<string> {
  try {
    const dataMatch = /^data:([^;]+);base64,(.+)$/i.exec(params.remoteUrl)
    if (dataMatch) {
      const uploaded = await uploadImageBuffer({
        buffer: Buffer.from(dataMatch[2], 'base64'),
        filename: params.filename,
        contentType: dataMatch[1],
      })
      return uploaded ?? params.remoteUrl
    }

    const imgRes = await fetch(params.remoteUrl)
    if (!imgRes.ok) return params.remoteUrl
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const uploaded = await uploadImageBuffer({
      buffer,
      filename: params.filename,
      contentType: imgRes.headers.get('content-type') ?? 'image/png',
    })
    return uploaded ?? params.remoteUrl
  } catch {
    return params.remoteUrl
  }
}

/** @deprecated Use hasImageGenerationKey — kept for callers checking paid OpenAI/Replicate paths. */
export function hasPaidImageFallbackKey(): boolean {
  return Boolean(allowDalleImages() || allowReplicateImages())
}
