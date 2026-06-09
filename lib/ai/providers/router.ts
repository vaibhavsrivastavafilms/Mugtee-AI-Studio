import {
  AIProviderError,
  type AIProvider,
  type AITask,
  type ExecuteWithFallbackResult,
  type ProviderId,
} from '@/lib/ai/providers/types'
import { recordProviderFailure, recordProviderSuccess, isProviderHealthy } from '@/lib/ai/providers/health'
import { getProviderAttemptOrder } from '@/lib/ai/providers/task-routing'
import { sleep } from '@/lib/ai/providers/shared'
import { GeminiProvider } from '@/lib/ai/providers/providers/gemini-provider'
import { GroqProvider } from '@/lib/ai/providers/providers/groq-provider'
import { OpenAIProvider } from '@/lib/ai/providers/providers/openai-provider'
import { OpenRouterProvider } from '@/lib/ai/providers/providers/openrouter-provider'
import { DeepSeekProvider } from '@/lib/ai/providers/providers/deepseek-provider'

const PROVIDER_INSTANCES: Record<ProviderId, AIProvider> = {
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  openrouter: new OpenRouterProvider(),
  deepseek: new DeepSeekProvider(),
}

const MAX_RETRIES_PER_PROVIDER = 2
const RETRY_BACKOFF_MS = [400, 1200]
const NON_RETRYABLE_HTTP_STATUSES = new Set([429, 402, 404])

/** Quota, billing, and missing-model errors should fail over immediately. */
function isNonRetryableProviderError(err: Error): boolean {
  const msg = err.message
  const httpMatch = msg.match(/\bHTTP\s+(\d{3})\b/i)
  if (httpMatch) {
    const status = Number(httpMatch[1])
    if (NON_RETRYABLE_HTTP_STATUSES.has(status)) return true
  }
  if (/\b429\b/.test(msg) && /quota|rate.?limit/i.test(msg)) return true
  if (/\b402\b/.test(msg) && /insufficient|balance|payment/i.test(msg)) return true
  if (/\b404\b/.test(msg) && /not found|no endpoints/i.test(msg)) return true
  return false
}

const FRIENDLY_ERRORS: Record<AITask, string> = {
  hook: 'Hook generation is taking a break — try again in a moment.',
  script: 'Script generation paused — your idea is saved. Retry shortly.',
  title: 'Title generation paused — try again shortly.',
  caption: 'Caption generation paused — try again shortly.',
  visual: 'Visual generation paused — try again shortly.',
  storyboard: 'Storyboard generation paused — try again shortly.',
  voice: 'Voice generation paused — try again shortly.',
  research: 'Research generation paused — try again shortly.',
}

export function getProviderInstance(id: ProviderId): AIProvider {
  return PROVIDER_INSTANCES[id]
}

export function getProviderForTask(task: AITask): AIProvider | null {
  const order = getProviderAttemptOrder(task)
  for (const id of order) {
    const provider = getProviderInstance(id)
    if (provider.isAvailable() && isProviderHealthy(id, task)) return provider
  }
  return null
}

async function runWithRetries<T>(
  task: AITask,
  provider: AIProvider,
  fn: (provider: AIProvider) => Promise<T>
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
    try {
      const result = await fn(provider)
      recordProviderSuccess(provider.id, task)
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      recordProviderFailure(provider.id, lastError.message, task)
      if (isNonRetryableProviderError(lastError)) break
      if (attempt < MAX_RETRIES_PER_PROVIDER) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 1200)
      }
    }
  }

  throw lastError ?? new Error(`${provider.id} failed`)
}

/**
 * Try primary → fallback → emergency providers for a task.
 * Retries each provider twice with backoff before moving on.
 */
export async function executeWithFallback<T extends { provider: ProviderId }>(
  task: AITask,
  fn: (provider: AIProvider) => Promise<T>
): Promise<ExecuteWithFallbackResult<T>> {
  const order = getProviderAttemptOrder(task)
  const attemptedProviders: ProviderId[] = []
  const errors: string[] = []

  if (order.length === 0) {
    throw createFriendlyError(task, 'No AI provider keys configured')
  }

  for (const id of order) {
    const provider = getProviderInstance(id)
    if (!provider.isAvailable()) continue
    if (!isProviderHealthy(id, task)) {
      errors.push(`${id}: unhealthy (cooldown)`)
      continue
    }

    attemptedProviders.push(id)
    try {
      const result = await runWithRetries(task, provider, fn)
      return { ...result, attemptedProviders }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${id}: ${message}`)
      console.warn(`[ai-router] ${task} failed on ${id}, trying next provider`)
    }
  }

  throw createFriendlyError(
    task,
    errors.length ? errors.join('; ') : 'All providers failed'
  )
}

function createFriendlyError(task: AITask, detail: string): AIProviderError {
  return new AIProviderError(
    detail,
    FRIENDLY_ERRORS[task] ?? 'Generation paused — try again.',
    undefined,
    task
  )
}

/** Dev-only: last provider used per task (in-memory). */
const lastUsedByTask = new Map<AITask, ProviderId>()

export function recordLastProvider(task: AITask, provider: ProviderId): void {
  lastUsedByTask.set(task, provider)
}

export function getLastProviderForTask(task: AITask): ProviderId | undefined {
  return lastUsedByTask.get(task)
}

export function getAllLastProviders(): Record<string, ProviderId> {
  return Object.fromEntries(lastUsedByTask.entries())
}
