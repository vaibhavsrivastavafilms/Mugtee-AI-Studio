import 'server-only'

import { TextProviderError } from '@/lib/ai/errors'
import { fetchWithTimeout } from '@/lib/ai/providers/shared'
import {
  getOpenRouterHeaders,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from '@/lib/ai/providers/openrouter/client'
import {
  isOpenRouterModelFailoverError,
  openRouterModelRouter,
} from '@/lib/ai/providers/openrouter/router'

export type OpenRouterGenerateInput = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  timeoutMs?: number
}

export type OpenRouterGenerateResult = {
  text: string
  model: string
  promptTokens?: number
  completionTokens?: number
}

function logOpenRouter(message: string, extra?: Record<string, unknown>): void {
  if (extra) {
    console.info(`[openrouter] ${message}`, extra)
  } else {
    console.info(`[openrouter] ${message}`)
  }
}

async function callOpenRouterChatCompletions(params: {
  model: string
  input: OpenRouterGenerateInput
}): Promise<OpenRouterGenerateResult> {
  const timeoutMs = params.input.timeoutMs ?? 90_000
  const started = Date.now()

  logOpenRouter('Generation started', { model: params.model })

  const res = await fetchWithTimeout(
    OPENROUTER_CHAT_COMPLETIONS_URL,
    {
      method: 'POST',
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.input.systemPrompt },
          { role: 'user', content: params.input.userPrompt },
        ],
        temperature: params.input.temperature ?? 0.4,
        response_format: { type: 'json_object' },
      }),
    },
    timeoutMs
  )

  const body = await res.text()
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new TextProviderError('OPENROUTER_AUTH_FAILED', 'openrouter', {
        httpStatus: res.status,
        message: 'OpenRouter authentication failed',
        model: params.model,
      })
    }

    if (res.status === 429) {
      throw new TextProviderError('OPENROUTER_MODEL_RATE_LIMITED', 'openrouter', {
        httpStatus: res.status,
        message: 'Model rate limited',
        model: params.model,
        failover: true,
      })
    }

    if (isOpenRouterModelFailoverError(res.status, body)) {
      throw new TextProviderError('OPENROUTER_MODEL_UNAVAILABLE', 'openrouter', {
        httpStatus: res.status,
        message: 'Model unavailable',
        model: params.model,
        failover: true,
      })
    }

    if (res.status >= 500) {
      throw new TextProviderError('OPENROUTER_API_UNAVAILABLE', 'openrouter', {
        httpStatus: res.status,
        message: `OpenRouter HTTP ${res.status}`,
        model: params.model,
      })
    }

    throw new TextProviderError('TEXT_PROVIDER_INVALID_RESPONSE', 'openrouter', {
      httpStatus: res.status,
      message: `OpenRouter HTTP ${res.status}`,
      model: params.model,
    })
  }

  const json = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
    error?: { message?: string }
  }

  if (json.error?.message) {
    throw new TextProviderError('TEXT_PROVIDER_INVALID_RESPONSE', 'openrouter', {
      message: json.error.message,
      model: params.model,
    })
  }

  const text = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) {
    throw new TextProviderError('TEXT_PROVIDER_INVALID_RESPONSE', 'openrouter', {
      message: 'OpenRouter returned empty content',
      model: params.model,
    })
  }

  const latencyMs = Date.now() - started
  logOpenRouter('Generation completed', {
    model: params.model,
    latencyMs,
    promptTokens: json.usage?.prompt_tokens ?? null,
    completionTokens: json.usage?.completion_tokens ?? null,
  })

  return {
    text,
    model: params.model,
    promptTokens: json.usage?.prompt_tokens,
    completionTokens: json.usage?.completion_tokens,
  }
}

function isFailoverError(err: unknown): err is TextProviderError {
  return err instanceof TextProviderError && err.failover === true
}

export async function openRouterGenerateContent(
  input: OpenRouterGenerateInput
): Promise<OpenRouterGenerateResult> {
  await openRouterModelRouter.ensureCatalog()

  const attempted: string[] = []
  const candidates = openRouterModelRouter.getRankedCandidateModels()
  const maxAttempts = 3

  if (candidates.length === 0) {
    throw new TextProviderError('NO_FREE_TEXT_MODEL_AVAILABLE', 'openrouter', {
      message: 'All free models are temporarily blacklisted. Retry later or configure an API key.',
      attemptedModels: [],
    })
  }

  for (const modelId of candidates.slice(0, maxAttempts)) {
    if (openRouterModelRouter.isBlacklisted(modelId)) continue

    attempted.push(modelId)
    try {
      const result = await callOpenRouterChatCompletions({ model: modelId, input })
      openRouterModelRouter.recordSuccess(modelId)
      return result
    } catch (err) {
      if (!isFailoverError(err)) throw err

      if (err.code === 'OPENROUTER_MODEL_RATE_LIMITED') {
        logOpenRouter('429 received', { model: modelId })
      }

      openRouterModelRouter.blacklistModel(
        modelId,
        err.code === 'OPENROUTER_MODEL_RATE_LIMITED' ? 'rate_limited' : 'unavailable'
      )

      const remaining = candidates.filter(
        (id) => id !== modelId && !openRouterModelRouter.isBlacklisted(id)
      )
      if (remaining.length > 0) {
        logOpenRouter('Switching to next model', { from: modelId, to: remaining[0] })
      }
    }
  }

  throw new TextProviderError('NO_FREE_TEXT_MODEL_AVAILABLE', 'openrouter', {
    message: 'Every free model failed or is blacklisted. Retry later or configure an API key.',
    attemptedModels: attempted,
  })
}
