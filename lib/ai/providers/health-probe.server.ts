import { buildProviderContext } from '@/lib/ai/providers/context-injection'
import { getProviderModel } from '@/lib/ai/providers/config.server'
import { recordProviderFailure, recordProviderSuccess } from '@/lib/ai/providers/health'
import { getProviderInstance } from '@/lib/ai/providers/provider-registry.server'
import { classifyProviderError } from '@/lib/ai/providers/error-classifier'
import {
  logAIProviderAttempt,
  logAIProviderResult,
  newProviderRequestId,
} from '@/lib/ai/providers/trace.server'
import type { AITask, ProviderId } from '@/lib/ai/providers/types'

/** Lightweight post-cooldown probe — clears unhealthy state on success. */
export async function runProviderHealthProbe(
  providerId: ProviderId,
  task?: AITask
): Promise<boolean> {
  const provider = getProviderInstance(providerId)
  if (!provider.isAvailable()) return false

  const requestId = newProviderRequestId()
  const model = getProviderModel(providerId)
  const startedAt = new Date().toISOString()
  const started = Date.now()

  logAIProviderAttempt({ provider: providerId, model, requestId, startedAt })

  try {
    const context = buildProviderContext({ topic: 'health-check' })
    await provider.generateHook({
      topic: 'health-check',
      niche: 'general',
      tone: 'neutral',
      platform: 'short-form',
      context,
    })
    recordProviderSuccess(providerId, task)
    logAIProviderResult({
      provider: providerId,
      success: true,
      httpStatus: 200,
      latencyMs: Date.now() - started,
      tokens: null,
      finishReason: 'probe',
      errorCode: null,
      errorMessage: null,
      retryable: false,
    })
    return true
  } catch (err) {
    const classified = classifyProviderError(err)
    recordProviderFailure(providerId, classified.message, task, {
      status: classified.httpStatus,
      errorCode: classified.kind,
    })
    logAIProviderResult({
      provider: providerId,
      success: false,
      httpStatus: classified.httpStatus,
      latencyMs: Date.now() - started,
      tokens: null,
      finishReason: null,
      errorCode: classified.kind,
      errorMessage: classified.reason,
      retryable: classified.retryable,
    })
    return false
  }
}
