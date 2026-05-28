import { getOpenAIClient } from '@/lib/ai/openai-client'
import { logError } from '@/lib/workspace/validation'

export function hasImageGenerationKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.EMERGENT_LLM_KEY?.trim() ||
      process.env.REPLICATE_API_TOKEN?.trim()
  )
}

export type SceneImageOptions = {
  quality?: 'standard' | 'hd'
  size?: '1024x1792' | '1792x1024' | '1024x1024'
}

/** Generate a cinematic still via OpenAI DALL-E 3. */
export async function generateOpenAISceneImage(
  prompt: string,
  opts: SceneImageOptions = {}
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  const { quality = 'standard', size = '1024x1792' } = opts
  try {
    const openai = getOpenAIClient()
    const res = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 3800),
      size,
      quality,
      n: 1,
    })
    return res.data?.[0]?.url ?? null
  } catch (err) {
    logError('generate-scene-image.openai', err)
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

/** Download remote image URL and persist to Supabase when userId provided. */
export async function persistRemoteImage(params: {
  remoteUrl: string
  userId?: string
  filename: string
}): Promise<string> {
  if (!params.userId) return params.remoteUrl

  try {
    const imgRes = await fetch(params.remoteUrl)
    if (!imgRes.ok) return params.remoteUrl
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const uploaded = await uploadImageBuffer({
      buffer,
      filename: params.filename,
      contentType: 'image/png',
    })
    return uploaded ?? params.remoteUrl
  } catch {
    return params.remoteUrl
  }
}
