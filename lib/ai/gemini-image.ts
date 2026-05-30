import {
  EMERGENT_GEMINI_IMAGE_MODEL,
  FREE_GEMINI_IMAGE_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  allowEmergentGateway,
  getGeminiApiKey,
  hasDirectGeminiKey,
} from '@/lib/ai/free-tier'
import { logError } from '@/lib/workspace/validation'

export type GeminiImagePromptOptions = {
  /** Reserved for future reference-image attachment */
  hasReferenceStyle?: boolean
}

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

function finalizeGeminiImagePrompt(prompt: string): string {
  return prompt.trim().slice(0, 3800)
}

function summarizeProviderBody(body: string, max = 280): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>
    const err = json.error as Record<string, unknown> | undefined
    if (err?.message) return String(err.message).slice(0, max)
    const msg = json.message
    if (typeof msg === 'string') return msg.slice(0, max)
  } catch {
    // non-JSON body
  }
  return trimmed.slice(0, max)
}

function logProviderHttpError(
  scope: string,
  status: number,
  body: string,
  extra?: Record<string, unknown>
): void {
  logError(scope, new Error(`HTTP ${status}`), {
    status,
    detail: summarizeProviderBody(body),
    ...extra,
  })
}

async function generateGeminiSceneImageDirect(
  prompt: string,
  _opts: GeminiImagePromptOptions = {}
): Promise<GeminiSceneImageResult | null> {
  const key = getGeminiApiKey()
  if (!key || !prompt.trim()) return null

  const model = FREE_GEMINI_IMAGE_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const cinematic = finalizeGeminiImagePrompt(prompt)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: cinematic }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logProviderHttpError('gemini-image.direct', res.status, body, {
        model,
      })
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
  prompt: string,
  _opts: GeminiImagePromptOptions = {}
): Promise<GeminiSceneImageResult | null> {
  const key = process.env.EMERGENT_LLM_KEY?.trim()
  if (!key || !prompt.trim()) return null

  const cinematic = finalizeGeminiImagePrompt(prompt)

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
        messages: [{ role: 'user', content: cinematic }],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logProviderHttpError('gemini-image.emergent', res.status, body, {
        model: GEMINI_IMAGE_MODEL,
      })
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
  prompt: string,
  opts: GeminiImagePromptOptions = {}
): Promise<GeminiSceneImageResult | null> {
  if (hasDirectGeminiKey()) {
    const direct = await generateGeminiSceneImageDirect(prompt, opts)
    if (direct) return direct
  }

  if (allowEmergentGateway()) {
    return generateGeminiSceneImageEmergent(prompt, opts)
  }

  return null
}

