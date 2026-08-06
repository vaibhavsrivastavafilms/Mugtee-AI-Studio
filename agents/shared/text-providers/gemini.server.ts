import 'server-only'

import {
  classifyHttpProviderError,
  classifyUnknownProviderError,
  ProviderRequestError,
  type TextLlmProviderId,
} from '@/agents/shared/provider-errors'
import type { StructuredJsonRequest, TextLlmProvider } from '@/agents/shared/text-llm.types'
import {
  FREE_GEMINI_TEXT_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  getGeminiApiKey,
} from '@/lib/ai/free-tier'
import { fetchWithTimeout, parseLlmJsonText } from '@/lib/ai/providers/shared'

async function callGeminiJson<T extends Record<string, unknown>>(
  params: StructuredJsonRequest
): Promise<T> {
  const provider: TextLlmProviderId = 'gemini'
  const key = getGeminiApiKey()
  if (!key) {
    throw new ProviderRequestError('PROVIDER_AUTH_FAILED', provider, {
      message: 'Gemini API key is not configured',
    })
  }

  const model = process.env.GEMINI_TEXT_MODEL?.trim() || FREE_GEMINI_TEXT_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  let res: Response
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: params.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
          generationConfig: {
            temperature: params.temperature ?? 0.4,
            responseMimeType: 'application/json',
          },
        }),
      },
      params.timeoutMs ?? 90_000
    )
  } catch (err) {
    throw classifyUnknownProviderError(provider, err)
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw classifyHttpProviderError(provider, res.status, errBody)
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') ?? ''

  if (!text.trim()) {
    throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
      message: 'Gemini returned empty JSON',
    })
  }

  const parsed = parseLlmJsonText(text)
  if (!parsed || Object.keys(parsed).length === 0) {
    throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
      message: 'Gemini returned invalid JSON',
    })
  }

  return parsed as T
}

export const geminiTextProvider: TextLlmProvider = {
  id: 'gemini',
  isConfigured() {
    return Boolean(getGeminiApiKey())
  },
  generateStructuredJson: callGeminiJson,
}
