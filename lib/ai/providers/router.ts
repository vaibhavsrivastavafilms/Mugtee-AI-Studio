import {
  AIProviderError,
  type AIProvider,
  type AITask,
  type ExecuteWithFallbackResult,
  type ProviderId,
} from '@/lib/ai/providers/types'
import {
  getCooldownRemainingMs,
  recordProviderFailure,
  recordProviderSuccess,
  isProviderHealthy,
} from '@/lib/ai/providers/health'
import { getProviderAttemptOrder } from '@/lib/ai/providers/task-routing'
import { getProviderModel } from '@/lib/ai/providers/config.server'
import { classifyProviderError, isNonRetryableClassified } from '@/lib/ai/providers/error-classifier'
import { getProviderInstance } from '@/lib/ai/providers/provider-registry.server'
import {
  logAIProviderAttempt,
  logAIProviderResult,
  logAIRouter,
  newProviderRequestId,
} from '@/lib/ai/providers/trace.server'
import {
  maxRetryAfterSeconds,
  type ProviderFailureSummary,
} from '@/lib/ai/providers/provider-diagnostics.types'
import { sleep } from '@/lib/ai/providers/shared'

export { getProviderInstance } from '@/lib/ai/providers/provider-registry.server'

const MAX_RETRIES_PER_PROVIDER = 2
const RETRY_BACKOFF_MS = [400, 1200]

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
  const model = getProviderModel(provider.id)
  let lastError: Error | undefined
  let lastClassification = classifyProviderError('unknown')

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
    const requestId = newProviderRequestId()
    const startedAt = new Date().toISOString()
    const started = Date.now()

    logAIProviderAttempt({
      provider: provider.id,
      model,
      requestId,
      startedAt,
    })

    try {
      const result = await fn(provider)
      recordProviderSuccess(provider.id, task)
      logAIProviderResult({
        provider: provider.id,
        success: true,
        httpStatus: 200,
        latencyMs: Date.now() - started,
        tokens: null,
        finishReason: 'stop',
        errorCode: null,
        errorMessage: null,
        retryable: false,
      })
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      lastClassification = classifyProviderError(lastError)
      recordProviderFailure(provider.id, lastClassification.message, task, {
        status: lastClassification.httpStatus,
        errorCode: lastClassification.kind,
      })
      logAIProviderResult({
        provider: provider.id,
        success: false,
        httpStatus: lastClassification.httpStatus,
        latencyMs: Date.now() - started,
        tokens: null,
        finishReason: null,
        errorCode: lastClassification.kind,
        errorMessage: lastClassification.reason,
        retryable: lastClassification.retryable,
      })
      if (isNonRetryableClassified(lastClassification)) break
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
  const providerFailures: ProviderFailureSummary[] = []

  if (order.length === 0) {
    throw createAggregatedError(task, [
      {
        provider: 'openai',
        status: null,
        reason: 'No AI provider keys configured',
        errorCode: 'unconfigured',
        retryable: false,
        skipped: true,
      },
    ])
  }

  for (const id of order) {
    const provider = getProviderInstance(id)
    const cooldownRemaining = getCooldownRemainingMs(id, task)
    const healthy = isProviderHealthy(id, task)
    const available = provider.isAvailable()

    if (!available) {
      logAIRouter({
        provider: id,
        healthy: false,
        cooldownRemaining: 0,
        selected: false,
        reason: 'not configured',
      })
      providerFailures.push({
        provider: id,
        status: null,
        reason: 'Not configured',
        errorCode: 'unconfigured',
        retryable: false,
        skipped: true,
      })
      continue
    }

    if (!healthy) {
      logAIRouter({
        provider: id,
        healthy: false,
        cooldownRemaining,
        selected: false,
        reason: `cooldown (${Math.ceil(cooldownRemaining / 1000)}s remaining)`,
      })
      providerFailures.push({
        provider: id,
        status: null,
        reason: 'In cooldown — retry shortly',
        errorCode: 'cooldown_skip',
        retryable: true,
        cooldownRemaining,
        skipped: true,
      })
      continue
    }

    logAIRouter({
      provider: id,
      healthy: true,
      cooldownRemaining: 0,
      selected: true,
      reason: 'selected for attempt',
    })

    attemptedProviders.push(id)
    try {
      const result = await runWithRetries(task, provider, fn)
      return { ...result, attemptedProviders }
    } catch (err) {
      const classified = classifyProviderError(err)
      providerFailures.push({
        provider: id,
        status: classified.httpStatus,
        reason: classified.reason,
        errorCode: classified.kind,
        retryable: classified.retryable,
      })
      console.warn(`[ai-router] ${task} failed on ${id}, trying next provider`)
    }
  }

  throw createAggregatedError(task, providerFailures)
}

function createAggregatedError(
  task: AITask,
  providerFailures: ProviderFailureSummary[]
): AIProviderError {
  const detail =
    providerFailures.length > 0
      ? providerFailures.map((f) => `${f.provider}: ${f.reason}`).join('; ')
      : 'All providers failed'

  return new AIProviderError(
    detail,
    FRIENDLY_ERRORS[task] ?? 'Generation paused — try again.',
    undefined,
    task,
    providerFailures,
    maxRetryAfterSeconds(providerFailures)
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
