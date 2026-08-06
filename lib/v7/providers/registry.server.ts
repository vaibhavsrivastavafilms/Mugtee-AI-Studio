import 'server-only'

import { groqFallbackProvider, groqProvider } from '@/lib/v7/providers/providers/groq.server'
import { ollamaProvider } from '@/lib/v7/providers/providers/ollama.server'
import {
  openRouterDeepSeekProvider,
  openRouterQwenProvider,
} from '@/lib/v7/providers/providers/openrouter.server'
import { togetherProvider } from '@/lib/v7/providers/providers/together.server'
import {
  classifyV7UnknownError,
  isV7RetryableError,
  V7AllProvidersFailedError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import type {
  V7TextGenerationInput,
  V7TextGenerationResult,
  V7TextProvider,
  V7TextProviderId,
} from '@/lib/v7/providers/text-provider.types'
import { sleep } from '@/lib/ai/providers/shared'
import {
  logV7ProviderFailure,
  logV7ProviderHealthSkip,
} from '@/lib/v7/providers/text-log.server'

const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [1_000, 2_000]

function logSuccess(agent: string, result: V7TextGenerationResult): void {
  console.info(
    `[v7] ${agent}\nProvider: ${result.provider}\nModel: ${result.model}\nDuration: ${result.durationMs} ms\nRetries: ${result.retries}\nStatus: Success`
  )
}

function logFallback(
  agent: string,
  provider: V7TextProvider,
  err: unknown,
  to?: V7TextProviderId
): void {
  logV7ProviderFailure({
    agent,
    providerId: provider.id,
    displayName: provider.displayName,
    model: provider.modelId,
    err,
    nextProviderId: to,
  })
}

function logAllFailed(
  agent: string,
  failures: Array<{ provider: V7TextProviderId; code: string; message?: string }>
): void {
  console.error(`[v7] ${agent}: all providers failed ${JSON.stringify({ failures })}`)
}

const DEFAULT_OSS_TEXT_ORDER: V7TextProviderId[] = [
  'ollama',
  'groq',
  'openrouter-qwen',
  'openrouter-deepseek',
  'together',
]

const RESEARCH_TEXT_ORDER: V7TextProviderId[] = [
  'ollama',
  'openrouter-qwen',
  'openrouter-deepseek',
  'groq',
  'together',
]

const SCRIPT_TEXT_ORDER: V7TextProviderId[] = [
  'ollama',
  'openrouter-qwen',
  'openrouter-deepseek',
  'groq',
  'together',
]

function reorderTextProviders(
  providers: V7TextProvider[],
  order: V7TextProviderId[]
): V7TextProvider[] {
  const byId = new Map(providers.map((provider) => [provider.id, provider]))
  const ordered: V7TextProvider[] = []
  for (const id of order) {
    const provider = byId.get(id)
    if (provider) ordered.push(provider)
  }
  for (const provider of providers) {
    if (!ordered.includes(provider)) ordered.push(provider)
  }
  return ordered
}

function baseV7TextProviders(): V7TextProvider[] {
  return [
    ollamaProvider,
    createGroqCompositeProvider(),
    openRouterQwenProvider,
    openRouterDeepSeekProvider,
    togetherProvider,
  ]
}

/** Ordered V7 text provider chain — Gemini is intentionally excluded. */
export function resolveV7TextProviders(agent?: string): V7TextProvider[] {
  const providers = baseV7TextProviders()
  const agentKey = agent?.trim().toLowerCase() ?? ''

  if (agentKey.includes('research')) {
    return reorderTextProviders(providers, RESEARCH_TEXT_ORDER)
  }
  if (agentKey.includes('script')) {
    return reorderTextProviders(providers, SCRIPT_TEXT_ORDER)
  }

  return reorderTextProviders(providers, DEFAULT_OSS_TEXT_ORDER)
}

function createGroqCompositeProvider(): V7TextProvider {
  return {
    id: 'groq',
    displayName: 'Groq',
    modelId: groqProvider.modelId,
    supports: (input) => groqProvider.supports(input),
    validateInput: (input) => groqProvider.validateInput(input),
    health: () => groqProvider.health(),
    estimateCost: (input) => groqProvider.estimateCost(input),
    estimateTime: (input) => groqProvider.estimateTime(input),
    normalizeOutput: (raw) => groqProvider.normalizeOutput(raw),
    cancel: () => {
      groqProvider.cancel()
      groqFallbackProvider.cancel()
    },
    cleanup: () => {
      groqProvider.cleanup()
      groqFallbackProvider.cleanup()
    },
    retry: (input, previous) => groqProvider.retry(input, previous),
    async generate(input) {
      if (!groqProvider.supports(input)) {
        throw new V7ProviderRequestError('PROVIDER_AUTH_FAILED', 'groq', {
          message: 'Groq API key not configured',
        })
      }
      try {
        return await groqProvider.generate(input)
      } catch (primaryErr) {
        if (!groqFallbackProvider.supports(input)) throw primaryErr
        try {
          return await groqFallbackProvider.generate(input)
        } catch {
          throw primaryErr
        }
      }
    },
  }
}

async function runProviderWithRetries(
  agent: string,
  provider: V7TextProvider,
  input: V7TextGenerationInput
): Promise<V7TextGenerationResult> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result =
        attempt === 0 ? await provider.generate(input) : await provider.retry(input, {
          success: false,
          provider: provider.displayName,
          model: '',
          output: '',
          tokens: 0,
          durationMs: 0,
          retries: attempt - 1,
        })
      return { ...result, retries: attempt }
    } catch (err) {
      lastError = err
      const classified =
        err instanceof V7ProviderRequestError
          ? err
          : classifyV7UnknownError(provider.id, err)

      if (!isV7RetryableError(classified) || attempt >= MAX_RETRIES) {
        throw classified
      }

      await sleep(RETRY_DELAYS_MS[attempt] ?? 2_000)
    }
  }

  throw lastError
}

export async function runV7TextProviderChain(
  input: V7TextGenerationInput & { agent: string }
): Promise<V7TextGenerationResult> {
  const providers = resolveV7TextProviders(input.agent).filter((p) => p.supports(input))
  if (providers.length === 0) {
    logAllFailed(input.agent, [])
    throw new V7AllProvidersFailedError([])
  }

  const failures: Array<{
    provider: V7TextProviderId
    code: V7ProviderRequestError['code']
    message?: string
  }> = []

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    const next = providers[i + 1]

    const validation = provider.validateInput(input)
    if (!validation.ok) {
      failures.push({ provider: provider.id, code: 'PROVIDER_INVALID_RESPONSE' })
      continue
    }

    // Cloud LLM keys are validated at configure-time; repeated /models probes during a
    // multi-stage production run can trip provider rate limits and fail later stages.
    const skipHealthProbe =
      process.env.NODE_ENV === 'production' && provider.id !== 'ollama'
    const health = skipHealthProbe ? { healthy: true as const } : await provider.health()
    if (!health.healthy) {
      failures.push({ provider: provider.id, code: 'PROVIDER_UNHEALTHY', message: health.message })
      if (next) {
        logV7ProviderHealthSkip({
          agent: input.agent,
          providerId: provider.id,
          message: health.message,
          nextProviderId: next.id,
        })
      }
      continue
    }

    try {
      const result = await runProviderWithRetries(input.agent, provider, input)
      logSuccess(input.agent, result)
      return result
    } catch (err) {
      const classified =
        err instanceof V7ProviderRequestError
          ? err
          : classifyV7UnknownError(provider.id, err)
      failures.push({
        provider: provider.id,
        code: classified.code,
        message: classified.message,
      })
      if (next) logFallback(input.agent, provider, classified, next.id)
    }
  }

  logAllFailed(
    input.agent,
    failures.map((f) => ({ provider: f.provider, code: f.code, message: f.message }))
  )
  throw new V7AllProvidersFailedError(failures)
}

export function validateV7TextProvidersOnStartup(): void {
  const chain = resolveV7TextProviders()
  const configured = chain.filter((p) => p.supports({ systemPrompt: 'x', userPrompt: 'y' }))

  if (configured.length === 0) {
    console.warn(
      '[v7] No text LLM providers configured. Start Ollama locally or set GROQ_API_KEY / OPENROUTER_API_KEY / TOGETHER_API_KEY.'
    )
    return
  }

  console.info(
    `[v7] Text providers ready (OSS-first): ${configured.map((p) => p.id).join(' → ')}`
  )

  if (!configured.some((p) => p.id === 'ollama') && !process.env.GROQ_API_KEY?.trim()) {
    console.warn(
      '[v7] For zero-cost text generation, run Ollama (OLLAMA_HOST) or add GROQ_API_KEY (free tier).'
    )
  }

  if (process.env.V7_TEXT_USE_GEMINI?.trim().toLowerCase() === 'true') {
    console.warn('[v7] V7_TEXT_USE_GEMINI is ignored — Gemini is disabled for V7 text generation.')
  }
}
