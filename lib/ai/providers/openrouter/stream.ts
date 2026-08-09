import 'server-only'

import { TextProviderError } from '@/lib/ai/errors'
import {
  getOpenRouterHeaders,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from '@/lib/ai/providers/openrouter/client'
import type { OpenRouterGenerateInput } from '@/lib/ai/providers/openrouter/generate'
import { openRouterModelRouter } from '@/lib/ai/providers/openrouter/router'

export async function* openRouterStreamGenerateContent(
  input: OpenRouterGenerateInput
): AsyncGenerator<string> {
  await openRouterModelRouter.ensureCatalog()
  const model = openRouterModelRouter.getRankedCandidateModels()[0]
  if (!model) {
    throw new TextProviderError('OPENROUTER_NO_AVAILABLE_FREE_MODEL', 'openrouter', {
      message: 'No free models available for streaming',
      attemptedModels: [],
    })
  }

  const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      temperature: input.temperature ?? 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new TextProviderError('OPENROUTER_API_UNAVAILABLE', 'openrouter', {
      httpStatus: res.status,
      message: body.slice(0, 300) || `OpenRouter HTTP ${res.status}`,
      model,
    })
  }

  if (!res.body) {
    throw new TextProviderError('TEXT_PROVIDER_INVALID_RESPONSE', 'openrouter', {
      message: 'OpenRouter stream body missing',
      model,
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return

        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const delta = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          /* ignore malformed SSE chunks */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
