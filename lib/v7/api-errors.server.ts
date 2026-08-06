import 'server-only'

import { AllProvidersFailedError } from '@/agents/shared/provider-errors'
import {
  V7AllProvidersFailedError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import type { V7StageId } from '@/types/v7/production'

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
    this.provider = options?.provider
    if (cause instanceof Error && cause.stack) this.stack = cause.stack
    if (cause instanceof Error) this.cause = cause
  }
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

export function buildV7ProductionErrorResponse(
  error: unknown,
  options?: { productionId?: string; stage?: V7StageId }
) {
  if (error instanceof V7AllProvidersFailedError || error instanceof AllProvidersFailedError) {
    return {
      status: 503 as const,
      body: {
        success: false as const,
        stage: options?.stage ?? 'idea',
        message: 'AI production is temporarily unavailable. Please try again.',
        error: 'ALL_PROVIDERS_FAILED',
        productionId: options?.productionId,
        failures: error.failures,
        ...(isDev() ? { stack: error.stack } : {}),
      },
    }
  }

  const stage =
    error instanceof V7StageExecutionError
      ? error.stage
      : options?.stage ?? 'idea'

  const productionId =
    error instanceof V7StageExecutionError
      ? error.productionId ?? options?.productionId
      : options?.productionId

  const provider =
    error instanceof V7StageExecutionError ? error.provider : undefined

  const message = error instanceof Error ? error.message : 'Production failed'
  const errorCode =
    error instanceof V7ProviderRequestError
      ? error.code
      : error instanceof Error
        ? error.name
        : 'UNKNOWN'

  return {
    status: 500 as const,
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
