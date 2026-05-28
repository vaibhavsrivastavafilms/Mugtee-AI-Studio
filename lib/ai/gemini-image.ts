import {
  EMERGENT_GEMINI_IMAGE_MODEL,
  FREE_GEMINI_IMAGE_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  allowEmergentGateway,
  getGeminiApiKey,
  hasDirectGeminiKey,
} from '@/lib/ai/free-tier'
import { logError } from '@/lib/workspace/validation'

/** Gemini image generation via Emergent universal LLM gateway (paid gateway). */
export const EMERGENT_LLM_URL =
  'https://integrations.emergentagent.com/llm/chat/completions'
export const GEMINI_IMAGE_MODEL = EMERGENT_GEMINI_IMAGE_MODEL

export function hasGeminiImageKey(): boolean {
  return hasDirectGeminiKey() || allowEmergentGateway()
}

export function extractGeminiImageB64(json: Record<string, unknown>): string | null {
  const data = json?.data
  if (Array.isArray(data) && (data[0] as { b64_json?: string })?.b64_json) {
    return String((data[0] as { b64_json: string }).b64_json)
  }

  const msg = (json?.choices as Array<{ message?: Record<string, unknown> }>)?.[0]
    ?.message
  if (msg) {
    const content = msg.content
    if (Array.isArray(content)) {
      for (const c of content) {
        const row = c as {
          type?: string
          image_url?: { url?: string }
          b64_json?: string
        }
        if (row?.type === 'image_url' && typeof row.image_url?.url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(row.image_url.url)
          if (m) return m[1]
        }
        if (typeof row?.b64_json === 'string') return row.b64_json
      }
    }
    if (typeof content === 'string') {
      const m = /data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)/.exec(content)
      if (m) return m[1]
    }

    const images = msg.images
    if (Array.isArray(images)) {
      for (const img of images) {
        const row = img as { image_url?: { url?: string }; b64_json?: string }
        const url = row?.image_url?.url
        if (typeof url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(url)
          if (m) return m[1]
        }
        if (typeof row?.b64_json === 'string') return row.b64_json
      }
    }
  }

  const parts =
    (json?.candidates as Array<{ content?: { parts?: Array<Record<string, unknown>> } }>)?.[0]
      ?.content?.parts || []
  for (const p of parts) {
    const inline = p?.inline_data as { data?: string } | undefined
    if (inline?.data) return String(inline.data)
    const inlineData = p?.inlineData as { data?: string } | undefined
    if (inlineData?.data) return String(inlineData.data)
  }
  return null
}

export type GeminiSceneImageResult = {
  buffer: Buffer
  b64: string
}

async function generateGeminiSceneImageDirect(
  prompt: string
): Promise<GeminiSceneImageResult | null> {
  const key = getGeminiApiKey()
  if (!key || !prompt.trim()) return null

  const model = FREE_GEMINI_IMAGE_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const cinematic = [
    prompt.trim(),
    'Composition: cinematic, professional, high detail, vertical 9:16 reel storyboard frame.',
    'No text overlays, no watermarks, no collage.',
  ].join('\n\n')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: cinematic.slice(0, 3800) }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    if (!res.ok) {
      logError('gemini-image.direct', new Error(`HTTP ${res.status}`))
      return null
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const b64 = extractGeminiImageB64(json)
    if (!b64) {
      logError('gemini-image.direct.no-image', new Error('No image in Gemini response'))
      return null
    }

    return { buffer: Buffer.from(b64, 'base64'), b64 }
  } catch (err) {
    logError('gemini-image.direct', err)
    return null
  }
}

async function generateGeminiSceneImageEmergent(
  prompt: string
): Promise<GeminiSceneImageResult | null> {
  const key = process.env.EMERGENT_LLM_KEY?.trim()
  if (!key || !prompt.trim()) return null

  const cinematic = [
    prompt.trim(),
    'Composition: cinematic, professional, high detail, vertical 9:16 reel storyboard frame.',
    'No text overlays, no watermarks, no collage.',
  ].join('\n\n')

  try {
    const res = await fetch(EMERGENT_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: GEMINI_IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: cinematic.slice(0, 3800) }],
      }),
    })

    if (!res.ok) {
      logError('gemini-image.emergent', new Error(`HTTP ${res.status}`))
      return null
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const b64 = extractGeminiImageB64(json)
    if (!b64) {
      logError('gemini-image.emergent.no-image', new Error('No image in Gemini response'))
      return null
    }

    return { buffer: Buffer.from(b64, 'base64'), b64 }
  } catch (err) {
    logError('gemini-image.emergent', err)
    return null
  }
}

/** Generate a cinematic still via Gemini (direct AI Studio first, then Emergent). */
export async function generateGeminiSceneImageBuffer(
  prompt: string
): Promise<GeminiSceneImageResult | null> {
  if (hasDirectGeminiKey()) {
    const direct = await generateGeminiSceneImageDirect(prompt)
    if (direct) return direct
  }

  if (allowEmergentGateway()) {
    return generateGeminiSceneImageEmergent(prompt)
  }

  return null
}
