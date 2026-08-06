import 'server-only'

import { parseLlmJsonText, fetchWithTimeout, SCRIPT_GENERATION_MAX_TOKENS } from '@/lib/ai/providers/shared'
import {
  classifyV7HttpError,
  classifyV7UnknownError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import type {
  V7TextGenerationInput,
  V7TextGenerationResult,
  V7TextProviderHealth,
  V7TextProviderId,
} from '@/lib/v7/providers/text-provider.types'

export type OpenAiCompatibleConfig = {
  id: V7TextProviderId
  displayName: string
  model: string
  baseUrl: string
  getApiKey: () => string | null
  extraHeaders?: () => Record<string, string>
  defaultTimeoutMs?: number
  isEnabled?: () => boolean
  maxTokens?: number
}

export function createOpenAiCompatibleV7Provider(config: OpenAiCompatibleConfig) {
  let activeController: AbortController | null = null

  function isConfigured(): boolean {
    if (config.isEnabled && !config.isEnabled()) return false
    return Boolean(config.getApiKey()?.trim())
  }

  async function health(): Promise<V7TextProviderHealth> {
    if (!isConfigured()) {
      return { healthy: false, message: 'Not configured' }
    }
    const started = Date.now()
    try {
      const key = config.getApiKey()!
      const res = await fetchWithTimeout(
        `${config.baseUrl.replace(/\/$/, '')}/models`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
            ...config.extraHeaders?.(),
          },
        },
        4_000
      )
      return {
        healthy: res.ok,
        latencyMs: Date.now() - started,
        message: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : 'Health check failed',
      }
    }
  }

  async function callChat(input: V7TextGenerationInput): Promise<{
    text: string
    tokens: number
    durationMs: number
  }> {
    const key = config.getApiKey()
    if (!key?.trim()) {
      throw new V7ProviderRequestError('PROVIDER_AUTH_FAILED', config.id, {
        message: 'API key not configured',
      })
    }

    const validation = validateInput(input)
    if (!validation.ok) {
      throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
        message: validation.reason,
      })
    }

    activeController?.abort()
    activeController = new AbortController()
    const started = Date.now()
    const timeoutMs = input.timeoutMs ?? config.defaultTimeoutMs ?? 60_000
    const envMax = Number(process.env.V7_TEXT_MAX_TOKENS?.trim())
    const maxTokens =
      config.maxTokens ??
      (Number.isFinite(envMax) && envMax > 0 ? envMax : SCRIPT_GENERATION_MAX_TOKENS)

    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            ...config.extraHeaders?.(),
          },
          body: JSON.stringify({
            model: config.model,
            temperature: input.temperature ?? 0.4,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: input.systemPrompt },
              { role: 'user', content: input.userPrompt },
            ],
          }),
          signal: activeController.signal,
        },
        timeoutMs
      )

      const body = await res.text()
      if (!res.ok) {
        throw classifyV7HttpError(config.id, res.status, body)
      }

      const json = JSON.parse(body) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { total_tokens?: number }
      }
      const text = json.choices?.[0]?.message?.content?.trim() ?? ''
      if (!text) {
        throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
          message: 'Empty model response',
        })
      }

      return {
        text,
        tokens: json.usage?.total_tokens ?? 0,
        durationMs: Date.now() - started,
      }
    } catch (err) {
      if (err instanceof V7ProviderRequestError) throw err
      throw classifyV7UnknownError(config.id, err)
    } finally {
      activeController = null
    }
  }

  function validateInput(input: V7TextGenerationInput): { ok: true } | { ok: false; reason: string } {
    if (!input.systemPrompt?.trim()) return { ok: false, reason: 'systemPrompt is required' }
    if (!input.userPrompt?.trim()) return { ok: false, reason: 'userPrompt is required' }
    return { ok: true }
  }

  function supports(_input: V7TextGenerationInput): boolean {
    return isConfigured()
  }

  function estimateCost(_input: V7TextGenerationInput): number {
    return 0
  }

  function estimateTime(_input: V7TextGenerationInput): number {
    return config.defaultTimeoutMs ?? 60_000
  }

  function normalizeOutput(raw: string): Record<string, unknown> {
    const parsed = parseLlmJsonText(raw)
    if (!parsed || Object.keys(parsed).length === 0) {
      throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', config.id, {
        message: 'Model returned invalid JSON',
      })
    }
    return parsed
  }

  async function generate(input: V7TextGenerationInput): Promise<V7TextGenerationResult> {
    const { text, tokens, durationMs } = await callChat(input)
    return {
      success: true,
      provider: config.displayName,
      model: config.model,
      output: text,
      tokens,
      durationMs,
      retries: 0,
    }
  }

  async function retry(
    input: V7TextGenerationInput,
    previous: V7TextGenerationResult
  ): Promise<V7TextGenerationResult> {
    const result = await generate(input)
    return { ...result, retries: previous.retries + 1 }
  }

  function cancel(): void {
    activeController?.abort()
    activeController = null
  }

  function cleanup(): void {
    cancel()
  }

  return {
    id: config.id,
    displayName: config.displayName,
    modelId: config.model,
    supports,
    validateInput,
    health,
    estimateCost,
    estimateTime,
    generate,
    normalizeOutput,
    retry,
    cancel,
    cleanup,
    isConfigured,
    callChat,
  }
}
