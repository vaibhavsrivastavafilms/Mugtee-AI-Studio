import type { CreatorStyleFingerprint } from '@/lib/ai/style-fingerprint'
import {
  isStyleConsistent,
  scoreOutputConsistency,
  STYLE_CONSISTENCY_THRESHOLD,
  type StyleConsistencyStep,
} from '@/lib/ai/style-fingerprint-validation'
import { trackStyleFingerprintDrift } from '@/lib/ai/style-fingerprint-analytics'
import {
  executeWithFallback,
  getProviderInstance,
  recordLastProvider,
} from '@/lib/ai/providers/router'
import { getProviderAttemptOrder } from '@/lib/ai/providers/task-routing'
import type {
  AIProvider,
  AITask,
  ExecuteWithFallbackResult,
  ProviderId,
} from '@/lib/ai/providers/types'

export type StyleGuardResult<T extends { provider: ProviderId }> =
  ExecuteWithFallbackResult<T> & {
    styleScore: number
    retryCount: number
    styleProvider: ProviderId
  }

function nextFallbackProvider(task: AITask, used: ProviderId): ProviderId | null {
  const order = getProviderAttemptOrder(task)
  const idx = order.indexOf(used)
  for (let i = idx + 1; i < order.length; i++) {
    const candidate = order[i]
    const provider = getProviderInstance(candidate)
    if (provider.isAvailable()) return candidate
  }
  return null
}

/**
 * Run router-backed generation, score output vs style fingerprint, retry once on fallback provider if drifted.
 */
export async function executeWithStyleGuard<T extends { provider: ProviderId }>(
  task: AITask,
  step: StyleConsistencyStep,
  fingerprint: CreatorStyleFingerprint,
  extractOutput: (result: T) => string | Record<string, unknown>,
  fn: (provider: AIProvider) => Promise<T>,
  options?: { projectId?: string | null }
): Promise<StyleGuardResult<T>> {
  let result = await executeWithFallback(task, fn)
  let score = scoreOutputConsistency(extractOutput(result), fingerprint, step)
  let retryCount = 0

  await trackStyleFingerprintDrift({
    step,
    provider: result.provider,
    fingerprint_score: score,
    retry_count: retryCount,
    projectId: options?.projectId,
    task,
  })

  if (isStyleConsistent(extractOutput(result), fingerprint, step)) {
    recordLastProvider(task, result.provider)
    return { ...result, styleScore: score, retryCount, styleProvider: result.provider }
  }

  const fallbackId = nextFallbackProvider(task, result.provider)
  if (!fallbackId) {
    recordLastProvider(task, result.provider)
    return { ...result, styleScore: score, retryCount, styleProvider: result.provider }
  }

  const fallbackProvider = getProviderInstance(fallbackId)
  const reason = `style_score_${score}_below_${STYLE_CONSISTENCY_THRESHOLD}`
  console.warn(
    `[ai-router] ${task} style drift (score=${score}), retrying on ${fallbackId}: ${reason}`
  )

  try {
    const retryResult = await fn(fallbackProvider)
    const retryScore = scoreOutputConsistency(extractOutput(retryResult), fingerprint, step)
    retryCount = 1
    result = {
      ...retryResult,
      provider: fallbackId,
      attemptedProviders: [
        ...result.attemptedProviders,
        fallbackId,
      ],
    }
    score = retryScore

    await trackStyleFingerprintDrift({
      step,
      provider: fallbackId,
      fingerprint_score: retryScore,
      retry_count: retryCount,
      retry_reason: reason,
      projectId: options?.projectId,
      task,
    })
  } catch (err) {
    console.warn(`[ai-router] ${task} style fallback failed on ${fallbackId}`, err)
  }

  recordLastProvider(task, result.provider)
  return { ...result, styleScore: score, retryCount, styleProvider: result.provider }
}
