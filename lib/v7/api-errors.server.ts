import 'server-only'

import { AllProvidersFailedError } from '@/agents/shared/provider-errors'
import { TextProviderError } from '@/lib/ai/errors'
import {
  V7AllProvidersFailedError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import {
  V7AllVideoProvidersFailedError,
  V7VideoProviderCapabilityBlockedError,
  V7VideoProviderNotReadyError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import { V7ImageProviderNotReadyError, V7ImagePromptValidationError, V7ImageProviderRequestError } from '@/lib/v7/providers/image-errors'
import { V7InputValidationError, V7UploadFailedError } from '@/lib/v7/input-validation.server'
import { V7ProviderNotAvailableError } from '@/lib/v7/provider-availability.server'
import type { V7StageId } from '@/types/v7/production'
import type { V7VideoProviderCapabilityReport } from '@/lib/v7/providers/video-provider.types'
import {
  mergeExecutionFailuresIntoEvaluations,
  resolveVideoChainTerminalError,
  toPublicCapabilityEvaluations,
} from '@/lib/v7/providers/video-chain-result.server'

export class V7StageExecutionError extends Error {
  readonly stage: V7StageId
  readonly productionId?: string
  readonly provider?: string

  constructor(
    stage: V7StageId,
    cause: unknown,
    options?: { productionId?: string; provider?: string }
  ) {
    const message = cause instanceof Error ? cause.message : String(cause)
    super(message)
    this.name = 'V7StageExecutionError'
    this.stage = stage
    this.productionId = options?.productionId
    this.provider = options?.provider ?? extractProviderFromCause(cause)
    if (cause instanceof Error && cause.stack) this.stack = cause.stack
    if (cause instanceof Error) this.cause = cause
  }
}

function extractProviderFromCause(cause: unknown): string | undefined {
  if (cause instanceof TextProviderError) return cause.provider
  if (cause instanceof V7ProviderRequestError) return cause.provider
  if (cause instanceof V7VideoProviderRequestError) return cause.provider
  if (cause instanceof V7AllProvidersFailedError) {
    return cause.failures[cause.failures.length - 1]?.provider
  }
  if (cause instanceof V7AllVideoProvidersFailedError) {
    return cause.failures[cause.failures.length - 1]?.provider
  }
  if (cause instanceof V7ProviderNotAvailableError) return cause.provider
  return undefined
}

function unwrapStageError(error: unknown): unknown {
  return error instanceof V7StageExecutionError && error.cause ? error.cause : error
}

export function logV7StageError(params: {
  stage: V7StageId
  productionId?: string
  provider?: string
  error: unknown
}): void {
  const { error } = params
  console.error({
    stage: params.stage,
    provider: params.provider ?? null,
    productionId: params.productionId ?? null,
    stack: error instanceof Error ? error.stack : error,
    message: error instanceof Error ? error.message : String(error),
  })
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

function resolveStage(error: unknown, fallback?: V7StageId): V7StageId {
  if (error instanceof V7StageExecutionError) return error.stage
  if (error instanceof V7InputValidationError) return error.stage
  if (error instanceof V7ProviderNotAvailableError) return error.stage as V7StageId
  return fallback ?? 'idea'
}

function resolveProductionId(error: unknown, fallback?: string): string | undefined {
  if (error instanceof V7StageExecutionError) return error.productionId ?? fallback
  return fallback
}

function resolveProvider(error: unknown): string | undefined {
  if (error instanceof V7StageExecutionError) return error.provider
  return extractProviderFromCause(unwrapStageError(error))
}

function summarizeProviderFailures(
  failures: Array<{ provider: string; code: string; message?: string }>
): string {
  if (failures.length === 0) {
    return 'AI production is temporarily unavailable. Please try again.'
  }

  const lines = failures.map((failure) => {
    const label = failure.provider.replace(/-/g, ' ')
    const detail = failure.message?.trim() || failure.code.replace(/_/g, ' ').toLowerCase()
    return `${label}: ${detail}`
  })

  if (lines.length === 1) return lines[0]

  return `All text providers failed — ${lines.join('; ')}`
}

function buildAllProvidersFailedBody(params: {
  stage: V7StageId
  productionId?: string
  provider?: string
  failures: Array<{ provider: string; code: string; message?: string }>
  stack?: string
}) {
  const last = params.failures[params.failures.length - 1]
  const message = summarizeProviderFailures(params.failures)
  return {
    success: false as const,
    stage: params.stage,
    message,
    error: 'ALL_PROVIDERS_FAILED' as const,
    provider: params.provider ?? last?.provider,
    reason: message,
    productionId: params.productionId,
    failures: params.failures,
    ...(isDev() && params.stack ? { stack: params.stack } : {}),
  }
}

function buildOpenArtNotAuthenticatedBody(params: {
  stage: V7StageId
  productionId?: string
  message?: string
  stack?: string
}) {
  return {
    status: 401 as const,
    body: {
      success: false as const,
      stage: params.stage,
      provider: 'openart' as const,
      state: 'NOT_AUTHENTICATED' as const,
      error: 'OPENART_NOT_AUTHENTICATED' as const,
      action: 'Complete OAuth connection at /api/openart/auth',
      message: params.message ?? 'OpenArt MCP is not connected. Complete OAuth to generate media.',
      connectUrl: '/api/openart/auth',
      productionId: params.productionId,
      ...(isDev() && params.stack ? { stack: params.stack } : {}),
    },
  }
}

function findOpenArtAuthenticationBlock(
  evaluations: V7VideoProviderCapabilityReport[]
): V7VideoProviderCapabilityReport | undefined {
  const openart = evaluations.find((entry) => entry.provider === 'openart-mcp')
  if (!openart || openart.available) return undefined
  if (openart.reason === 'NOT_AUTHENTICATED' || openart.reason === 'NOT_CONFIGURED') {
    return openart
  }
  return undefined
}

function shouldReturnOpenArtAuthError(evaluations: V7VideoProviderCapabilityReport[]): boolean {
  const openartBlock = findOpenArtAuthenticationBlock(evaluations)
  if (!openartBlock) return false
  const anyOtherReady = evaluations.some(
    (entry) => entry.provider !== 'openart-mcp' && entry.available
  )
  return !anyOtherReady
}

function buildCapabilityBlockedBody(params: {
  stage: V7StageId
  productionId?: string
  evaluations: V7VideoProviderCapabilityReport[]
  stack?: string
  sceneNumber?: number
  executionFailures?: Array<{
    provider: string
    code: string
    message?: string
    stack?: string
  }>
}) {
  if (shouldReturnOpenArtAuthError(params.evaluations)) {
    const openart = findOpenArtAuthenticationBlock(params.evaluations)
    return buildOpenArtNotAuthenticatedBody({
      stage: params.stage,
      productionId: params.productionId,
      message: openart?.message,
      stack: params.stack,
    })
  }

  const providerExceptions =
    params.executionFailures
      ?.filter((failure) => failure.stack || failure.message)
      .map((failure) => ({
        provider: failure.provider === 'openart-mcp' ? 'openart' : failure.provider,
        error: 'PROVIDER_EXCEPTION' as const,
        exception: failure.message ?? failure.code,
        ...(isDev() && failure.stack ? { stack: failure.stack } : {}),
      })) ?? []

  const providerReport = toPublicCapabilityEvaluations(params.evaluations)

  return {
    status: 503 as const,
    body: {
      success: false as const,
      stage: params.stage,
      message: 'No scene video provider is capable of generating this scene right now.',
      error: 'VIDEO_PROVIDER_NOT_READY' as const,
      selectedProvider: null,
      reason: 'No scene video provider is capable of generating this scene right now.',
      providerReport,
      evaluations: providerReport,
      ...(params.sceneNumber ? { scene: params.sceneNumber } : {}),
      ...(providerExceptions.length > 0 ? { providerExceptions } : {}),
      productionId: params.productionId,
      ...(isDev() && params.stack ? { stack: params.stack } : {}),
    },
  }
}

export function buildV7ProductionErrorResponse(
  error: unknown,
  options?: { productionId?: string; stage?: V7StageId }
) {
  const root = unwrapStageError(error)
  const stage = resolveStage(error, options?.stage)
  const productionId = resolveProductionId(error, options?.productionId)
  const provider = resolveProvider(error)

  if (root instanceof V7ImagePromptValidationError) {
    return {
      status: 422 as const,
      body: {
        success: false as const,
        ok: false as const,
        stage: stage ?? 'image',
        message: root.message,
        error: root.code,
        sceneNumber: root.sceneNumber,
        scene: root.sceneNumber,
        score: root.score,
        missingRequirements: root.missingRequirements,
        forbiddenTermsFound: root.forbiddenTermsFound,
        retryable: true,
        productionId,
        ...(isDev() ? { stack: root.stack, finalPrompt: root.finalPrompt } : {}),
      },
    }
  }

  if (root instanceof V7ImageProviderRequestError) {
    return {
      status: 503 as const,
      body: {
        success: false as const,
        ok: false as const,
        stage: stage ?? 'image',
        message: root.message,
        error: root.code,
        provider: root.provider,
        reason: root.message,
        retryable: root.code !== 'PROVIDER_AUTH_FAILED' && root.code !== 'PROVIDER_INVALID_RESPONSE',
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7InputValidationError) {
    return {
      status: 422 as const,
      body: {
        success: false as const,
        stage: root.stage,
        message: root.message,
        error: root.code,
        issues: root.issues,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7UploadFailedError) {
    const uploadError =
      root.stage === 'animation' ? ('WAN_UPLOAD_FAILED' as const) : root.code
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage: root.stage,
        message: root.message,
        error: uploadError,
        storagePath: root.storagePath,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7ProviderNotAvailableError) {
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage: (root.stage as V7StageId) ?? stage,
        message: root.message,
        error: root.code,
        provider: root.provider,
        requiredEnv: root.requiredEnv,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7ImageProviderNotReadyError) {
    const pollinationsCode = root.reason.includes('POLLINATIONS_CREDITS')
      ? 'POLLINATIONS_CREDITS_REQUIRED'
      : root.reason.includes('POLLINATIONS_API_KEY_REQUIRED') ||
          root.reason.toLowerCase().includes('missing')
        ? 'POLLINATIONS_API_KEY_REQUIRED'
        : root.reason.includes('POLLINATIONS_AUTH_FAILED') ||
            root.reason.toLowerCase().includes('rejected')
          ? 'POLLINATIONS_AUTH_FAILED'
          : root.code
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage,
        message: root.reason,
        error: pollinationsCode,
        provider: 'pollinations',
        reason: root.reason,
        action: root.action,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7VideoProviderNotReadyError) {
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage,
        message: root.reason,
        error: root.code,
        provider: 'wan',
        reason: root.reason,
        action: root.action,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7VideoProviderCapabilityBlockedError) {
    return buildCapabilityBlockedBody({
      stage,
      productionId,
      evaluations: root.evaluations,
      stack: root.stack,
      sceneNumber: root.sceneNumber,
      executionFailures: root.executionFailures,
    })
  }

  if (root instanceof V7AllVideoProvidersFailedError && root.failures.length === 0) {
    if (shouldReturnOpenArtAuthError(root.evaluations)) {
      const openart = findOpenArtAuthenticationBlock(root.evaluations)
      return buildOpenArtNotAuthenticatedBody({
        stage,
        productionId,
        message: openart?.message,
        stack: root.stack,
      })
    }
    return {
      status: 401 as const,
      body: {
        success: false as const,
        stage,
        message:
          'OpenArt MCP is not connected. Complete OAuth at /api/openart/auth to generate scene videos.',
        error: 'OPENART_NOT_AUTHENTICATED' as const,
        provider: 'openart' as const,
        state: 'NOT_AUTHENTICATED' as const,
        action: 'Complete OAuth connection at /api/openart/auth',
        connectUrl: '/api/openart/auth',
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (
    root instanceof V7AllProvidersFailedError ||
    root instanceof AllProvidersFailedError ||
    root instanceof V7AllVideoProvidersFailedError
  ) {
    if (root instanceof V7AllVideoProvidersFailedError) {
      if (shouldReturnOpenArtAuthError(root.evaluations)) {
        const openart = findOpenArtAuthenticationBlock(root.evaluations)
        return buildOpenArtNotAuthenticatedBody({
          stage,
          productionId,
          message: openart?.message,
          stack: root.stack,
        })
      }

      const executionFailures = root.failures.map((failure) => ({
        provider: failure.provider,
        code: failure.code,
        message: failure.message,
      }))
      const mergedEvaluations = mergeExecutionFailuresIntoEvaluations(
        root.evaluations,
        executionFailures
      )
      const terminal = resolveVideoChainTerminalError({
        evaluations: mergedEvaluations,
        executionFailures,
      })

      if (terminal === 'capability_blocked') {
        return buildCapabilityBlockedBody({
          stage,
          productionId,
          evaluations: mergedEvaluations,
          stack: root.stack,
          executionFailures: root.failures,
        })
      }

      return {
        status: 503 as const,
        body: {
          ...buildAllProvidersFailedBody({
            stage,
            productionId,
            provider,
            failures: root.failures,
            stack: root.stack,
          }),
          selectedProvider: null,
          providerReport: toPublicCapabilityEvaluations(mergedEvaluations),
          evaluations: toPublicCapabilityEvaluations(mergedEvaluations),
        },
      }
    }

    return {
      status: 503 as const,
      body: buildAllProvidersFailedBody({
        stage,
        productionId,
        provider,
        failures: root.failures,
        stack: root.stack,
      }),
    }
  }

  if (root instanceof V7VideoProviderRequestError) {
    if (root.provider === 'openart-mcp' && root.code === 'PROVIDER_AUTH_FAILED') {
      return buildOpenArtNotAuthenticatedBody({
        stage,
        productionId,
        message: root.message,
        stack: root.stack,
      })
    }

    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage,
        message: root.message,
        error: root.code,
        provider: root.provider === 'openart-mcp' ? 'openart' : root.provider,
        reason: root.message,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof TextProviderError) {
    const message =
      root.code === 'OPENROUTER_AUTH_FAILED'
        ? 'OpenRouter authentication is not configured for this deployment'
        : root.message
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage,
        message,
        error: root.code,
        provider: root.provider,
        reason: message,
        productionId,
        ...(root.model ? { model: root.model } : {}),
        ...(root.attemptedModels?.length ? { attempted: root.attemptedModels } : {}),
        ...(root.retryCount != null ? { retryCount: root.retryCount } : {}),
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  if (root instanceof V7ProviderRequestError) {
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage,
        message: root.message,
        error: root.code,
        provider: root.provider,
        reason: root.message,
        productionId,
        ...(isDev() ? { stack: root.stack } : {}),
      },
    }
  }

  const message = error instanceof Error ? error.message : 'Production failed'
  const errorCode =
    error instanceof Error && error.name === 'V7StageExecutionError'
      ? 'STAGE_EXECUTION_FAILED'
      : 'UNKNOWN'

  return {
    status: 503 as const,
    body: {
      success: false as const,
      stage,
      message,
      error: errorCode,
      productionId,
      ...(provider ? { provider } : {}),
      ...(isDev() && error instanceof Error && error.stack ? { stack: error.stack } : {}),
    },
  }
}
