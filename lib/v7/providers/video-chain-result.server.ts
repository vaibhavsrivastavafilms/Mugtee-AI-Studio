import 'server-only'

import type { V7VideoProviderErrorCode } from '@/lib/v7/providers/video-errors'
import {
  V7AllVideoProvidersFailedError,
  V7VideoProviderCapabilityBlockedError,
  V7VideoProviderNotReadyError,
  V7VideoProviderRequestError,
  classifyV7VideoUnknownError,
} from '@/lib/v7/providers/video-errors.server'

function unwrapAnimationError(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'V7StageExecutionError' &&
    'cause' in error
  ) {
    return (error as { cause: unknown }).cause
  }
  return error
}
import type {
  V7VideoProviderCapabilityReason,
  V7VideoProviderCapabilityReport,
  V7VideoProviderId,
} from '@/lib/v7/providers/video-provider.types'

export type V7VideoChainExecutionFailure = {
  provider: V7VideoProviderId
  code: V7VideoProviderErrorCode
  message?: string
  stack?: string
}

function normalizeOpenArtProviderId(provider: V7VideoProviderId): string {
  return provider === 'openart-mcp' ? 'openart' : provider
}

export function inferCapabilityReasonFromExecutionFailure(
  failure: V7VideoChainExecutionFailure
): V7VideoProviderCapabilityReason {
  const message = (failure.message ?? '').toLowerCase()

  if (
    message.includes('wan_model_not_enabled') ||
    message.includes('model_not_available') ||
    message.includes('not eligible') ||
    message.includes('unpurchased') ||
    message.includes('model not enabled')
  ) {
    return 'MODEL_NOT_ENABLED'
  }

  if (
    message.includes('not connected') ||
    message.includes('not authenticated') ||
    message.includes('oauth') ||
    message.includes('missing') ||
    message.includes('api key') ||
    message.includes('key_') ||
    message.includes('authorization header')
  ) {
    return 'NOT_AUTHENTICATED'
  }

  if (
    message.includes('pollinations_credits_exhausted') ||
    message.includes('pollinations_credits_required') ||
    message.includes('insufficient pollen') ||
    message.includes('insufficient balance') ||
    failure.code === 'PROVIDER_QUOTA_EXCEEDED'
  ) {
    return 'NOT_ENTITLED'
  }

  if (message.includes('not configured') || failure.code === 'PROVIDER_AUTH_FAILED') {
    return failure.message?.includes('endpoint') ? 'NOT_CONFIGURED' : 'NOT_AUTHENTICATED'
  }

  if (failure.code === 'PROVIDER_UNHEALTHY') return 'UNHEALTHY'
  if (failure.code === 'PROVIDER_INVALID_RESPONSE') return 'INPUT_REJECTED'

  return 'NOT_ENTITLED'
}

export function isCapabilityExecutionFailure(failure: V7VideoChainExecutionFailure): boolean {
  if (failure.code === 'PROVIDER_RATE_LIMITED' || failure.code === 'PROVIDER_TIMEOUT') {
    return false
  }
  if (failure.code === 'PROVIDER_UNAVAILABLE' && !failure.message?.toLowerCase().includes('rate')) {
    const message = failure.message?.toLowerCase() ?? ''
    if (message.includes('timeout') || message.includes('network')) return false
  }

  const reason = inferCapabilityReasonFromExecutionFailure(failure)
  return (
    reason === 'MODEL_NOT_ENABLED' ||
    reason === 'NOT_AUTHENTICATED' ||
    reason === 'NOT_CONFIGURED' ||
    reason === 'MODEL_NOT_AVAILABLE' ||
    reason === 'NOT_ENTITLED' ||
    failure.code === 'PROVIDER_AUTH_FAILED' ||
    failure.code === 'PROVIDER_QUOTA_EXCEEDED'
  )
}

export function mergeExecutionFailuresIntoEvaluations(
  evaluations: V7VideoProviderCapabilityReport[],
  executionFailures: V7VideoChainExecutionFailure[]
): V7VideoProviderCapabilityReport[] {
  return evaluations.map((entry) => {
    const failure = executionFailures.find((item) => item.provider === entry.provider)
    if (!failure) return entry

    const reason = inferCapabilityReasonFromExecutionFailure(failure)
    return {
      ...entry,
      available: false,
      reason,
      message: failure.message ?? entry.message,
    }
  })
}

export function resolveVideoChainTerminalError(params: {
  evaluations: V7VideoProviderCapabilityReport[]
  executionFailures: V7VideoChainExecutionFailure[]
}): 'capability_blocked' | 'all_providers_failed' {
  if (params.executionFailures.length === 0) return 'capability_blocked'

  const allCapabilityFailures = params.executionFailures.every(isCapabilityExecutionFailure)
  const noneAvailable = params.evaluations.every((entry) => !entry.available)

  if (noneAvailable || allCapabilityFailures) return 'capability_blocked'
  return 'all_providers_failed'
}

export function toPublicCapabilityEvaluations(
  evaluations: V7VideoProviderCapabilityReport[]
): Array<{
  provider: string
  available: boolean
  reason?: V7VideoProviderCapabilityReason
  message?: string
}> {
  return evaluations.map((entry) => ({
    provider: normalizeOpenArtProviderId(entry.provider),
    available: entry.available,
    ...(entry.reason ? { reason: entry.reason } : {}),
    ...(entry.message ? { message: entry.message } : {}),
  }))
}

export function buildVideoProviderSelectionReport(params: {
  evaluations: V7VideoProviderCapabilityReport[]
  selectedProvider?: V7VideoProviderId | null
  executionFailures?: V7VideoChainExecutionFailure[]
}): {
  selectedProvider: string | null
  providerReport: ReturnType<typeof toPublicCapabilityEvaluations>
} {
  const merged = params.executionFailures?.length
    ? mergeExecutionFailuresIntoEvaluations(params.evaluations, params.executionFailures)
    : params.evaluations

  return {
    selectedProvider: params.selectedProvider
      ? normalizeOpenArtProviderId(params.selectedProvider)
      : null,
    providerReport: toPublicCapabilityEvaluations(merged),
  }
}

export function throwVideoChainTerminalError(params: {
  sceneNumber: number
  productionId: string
  evaluations: V7VideoProviderCapabilityReport[]
  executionFailures: V7VideoChainExecutionFailure[]
}): never {
  const mergedEvaluations = mergeExecutionFailuresIntoEvaluations(
    params.evaluations,
    params.executionFailures
  )
  const terminal = resolveVideoChainTerminalError({
    evaluations: mergedEvaluations,
    executionFailures: params.executionFailures,
  })

  console.error('[v7-video] chain terminal', {
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    terminal,
    evaluations: toPublicCapabilityEvaluations(mergedEvaluations),
    executionFailures: params.executionFailures.map((failure) => ({
      provider: failure.provider,
      code: failure.code,
      message: failure.message,
    })),
  })

  if (terminal === 'capability_blocked') {
    throw new V7VideoProviderCapabilityBlockedError(mergedEvaluations, {
      sceneNumber: params.sceneNumber,
      executionFailures: params.executionFailures,
    })
  }

  throw new V7AllVideoProvidersFailedError(params.executionFailures, mergedEvaluations)
}

export function formatV7AnimationStageError(error: unknown): string {
  const unwrapped = unwrapAnimationError(error)

  if (unwrapped instanceof V7VideoProviderNotReadyError) {
    return `VIDEO_PROVIDER_NOT_READY — ${unwrapped.reason}`
  }

  if (unwrapped instanceof V7VideoProviderCapabilityBlockedError) {
    const scene = unwrapped.sceneNumber ? `scene ${unwrapped.sceneNumber}` : 'animation'
    const execution = unwrapped.executionFailures?.[0]
    if (execution?.message) {
      return execution.message.startsWith('POLLINATIONS_')
        ? execution.message
        : `${execution.message} (${scene})`
    }
    const blocked = toPublicCapabilityEvaluations(unwrapped.evaluations)
      .filter((entry) => !entry.available)
      .map((entry) => `${entry.provider}:${entry.reason ?? 'UNAVAILABLE'}${entry.message ? ` — ${entry.message}` : ''}`)
      .join(', ')
    return blocked.includes('INPUT_REJECTED') && execution?.message
      ? execution.message
      : `PROVIDER_CAPABILITY_BLOCKED (${scene}) — ${blocked}`
  }

  if (unwrapped instanceof V7AllVideoProvidersFailedError) {
    const merged = mergeExecutionFailuresIntoEvaluations(
      unwrapped.evaluations,
      unwrapped.failures.map((failure) => ({
        provider: failure.provider,
        code: failure.code,
        message: failure.message,
      }))
    )
    const terminal = resolveVideoChainTerminalError({
      evaluations: merged,
      executionFailures: unwrapped.failures.map((failure) => ({
        provider: failure.provider,
        code: failure.code,
        message: failure.message,
      })),
    })
    if (terminal === 'capability_blocked') {
      const blocked = toPublicCapabilityEvaluations(merged)
        .filter((entry) => !entry.available)
        .map((entry) => `${entry.provider}:${entry.reason ?? 'UNAVAILABLE'}`)
        .join(', ')
      return `PROVIDER_CAPABILITY_BLOCKED (animation) — ${blocked}`
    }
    const blocked = toPublicCapabilityEvaluations(merged)
      .filter((entry) => !entry.available)
      .map((entry) => `${entry.provider}:${entry.reason ?? 'UNAVAILABLE'}`)
      .join(', ')
    return blocked
      ? `ALL_PROVIDERS_FAILED (animation) — ${blocked}`
      : 'ALL_PROVIDERS_FAILED'
  }

  if (
    unwrapped instanceof Error &&
    typeof unwrapped.message === 'string' &&
    unwrapped.message.trim() &&
    unwrapped.message !== 'ALL_PROVIDERS_FAILED'
  ) {
    return unwrapped.message
  }

  return 'Animation failed'
}

export function classifyExecutionFailure(
  provider: V7VideoProviderId,
  err: unknown
): V7VideoChainExecutionFailure {
  if (err instanceof V7VideoProviderRequestError) {
    return {
      provider,
      code: err.code,
      message: err.message,
      stack: err.stack,
    }
  }

  const message = err instanceof Error ? err.message : String(err)
  const classified = classifyV7VideoUnknownError(provider, err)

  return {
    provider,
    code: classified.code,
    message: message || classified.message,
    stack: classified.stack,
  }
}
