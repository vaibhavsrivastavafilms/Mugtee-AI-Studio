import 'server-only'

import { fetchWithTimeout, parseLlmJsonText } from '@/lib/ai/providers/shared'
import {
  classifyV7UnknownError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import type {
  V7TextGenerationInput,
  V7TextGenerationResult,
  V7TextProvider,
  V7TextProviderHealth,
} from '@/lib/v7/providers/text-provider.types'

const DEFAULT_HOST = 'http://localhost:11434'

function ollamaHost(): string {
  return (process.env.OLLAMA_HOST?.trim() || DEFAULT_HOST).replace(/\/$/, '')
}

function ollamaModels(): string[] {
  const env = process.env.V7_OLLAMA_MODEL?.trim() || process.env.OLLAMA_MODEL?.trim()
  const defaults = ['qwen3', 'deepseek-r1', 'deepseek-v3', 'llama3.3', 'gemma3', 'mistral']
  if (env) return [env, ...defaults.filter((m) => m !== env)]
  return defaults
}

function isOllamaEnabled(): boolean {
  if (process.env.V7_OLLAMA_ENABLED?.trim() === 'false') return false
  if (process.env.OLLAMA_ENABLED?.trim() === 'false') return false
  if (process.env.NODE_ENV === 'production') {
    const host = ollamaHost()
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return process.env.OLLAMA_HOST?.trim() ? true : false
    }
  }
  return true
}

let activeController: AbortController | null = null

function validateInput(input: V7TextGenerationInput): { ok: true } | { ok: false; reason: string } {
  if (!input.systemPrompt?.trim()) return { ok: false, reason: 'systemPrompt is required' }
  if (!input.userPrompt?.trim()) return { ok: false, reason: 'userPrompt is required' }
  return { ok: true }
}

async function health(): Promise<V7TextProviderHealth> {
  if (!isOllamaEnabled()) return { healthy: false, message: 'Disabled' }
  const started = Date.now()
  try {
    const res = await fetchWithTimeout(`${ollamaHost()}/api/tags`, { method: 'GET' }, 3_000)
    return {
      healthy: res.ok,
      latencyMs: Date.now() - started,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - started,
      message: err instanceof Error ? err.message : 'Unavailable',
    }
  }
}

async function generateWithModel(
  model: string,
  input: V7TextGenerationInput
): Promise<V7TextGenerationResult> {
  const validation = validateInput(input)
  if (!validation.ok) {
    throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'ollama', {
      message: validation.reason,
    })
  }

  activeController?.abort()
  activeController = new AbortController()
  const started = Date.now()
  const timeoutMs = input.timeoutMs ?? 120_000

  try {
    const res = await fetchWithTimeout(
      `${ollamaHost()}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: activeController.signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.userPrompt },
          ],
          options: { temperature: input.temperature ?? 0.4 },
        }),
      },
      timeoutMs
    )

    const body = await res.text()
    if (!res.ok) {
      throw new V7ProviderRequestError('PROVIDER_UNAVAILABLE', 'ollama', {
        httpStatus: res.status,
        message: body.slice(0, 200),
      })
    }

    const json = JSON.parse(body) as { message?: { content?: string } }
    const text = json.message?.content?.trim() ?? ''
    if (!text) {
      throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'ollama', {
        message: 'Empty Ollama response',
      })
    }

    return {
      success: true,
      provider: 'Ollama',
      model,
      output: text,
      tokens: 0,
      durationMs: Date.now() - started,
      retries: 0,
    }
  } catch (err) {
    if (err instanceof V7ProviderRequestError) throw err
    throw classifyV7UnknownError('ollama', err)
  } finally {
    activeController = null
  }
}

export const ollamaProvider: V7TextProvider = {
  id: 'ollama',
  displayName: 'Ollama',
  supports: () => isOllamaEnabled(),
  validateInput,
  health,
  estimateCost: () => 0,
  estimateTime: () => 120_000,
  normalizeOutput(raw) {
    const parsed = parseLlmJsonText(raw)
    if (!parsed || Object.keys(parsed).length === 0) {
      throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'ollama', {
        message: 'Invalid JSON from Ollama',
      })
    }
    return parsed
  },
  cancel() {
    activeController?.abort()
    activeController = null
  },
  cleanup() {
    this.cancel()
  },
  retry(input, previous) {
    return this.generate(input).then((r) => ({ ...r, retries: previous.retries + 1 }))
  },
  async generate(input) {
    if (!isOllamaEnabled()) {
      throw new V7ProviderRequestError('PROVIDER_UNHEALTHY', 'ollama', {
        message: 'Ollama disabled',
      })
    }

    let lastError: unknown
    for (const model of ollamaModels()) {
      try {
        return await generateWithModel(model, input)
      } catch (err) {
        lastError = err
      }
    }
    throw lastError
  },
}
