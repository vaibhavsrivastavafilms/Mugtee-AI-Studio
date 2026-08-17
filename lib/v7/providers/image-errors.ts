import type { V7ImageProviderId } from '@/lib/v7/providers/image-provider.types'

export type V7ImageProviderErrorCode =
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_UNHEALTHY'
  | 'ALL_PROVIDERS_FAILED'
  | 'IMAGE_PROVIDER_NOT_READY'
  | 'IMAGE_PROMPT_VALIDATION_FAILED'
  | 'IMAGE_STORY_MISMATCH'
  | 'FOREIGN_IMAGE_DETECTED'
  | 'IMAGE_GENERATION_RELEVANCE_FAILED'

export class V7ImageProviderRequestError extends Error {
  readonly code: V7ImageProviderErrorCode
  readonly provider: V7ImageProviderId
  readonly httpStatus?: number

  constructor(
    code: V7ImageProviderErrorCode,
    provider: V7ImageProviderId,
    options?: { httpStatus?: number; message?: string; cause?: unknown }
  ) {
    super(options?.message ?? code)
    this.name = 'V7ImageProviderRequestError'
    this.code = code
    this.provider = provider
    this.httpStatus = options?.httpStatus
    if (options?.cause) this.cause = options.cause
  }
}

export class V7ImageProviderNotReadyError extends Error {
  readonly code = 'IMAGE_PROVIDER_NOT_READY' as const
  readonly provider = 'pollinations' as const
  readonly reason: string
  readonly action: string

  constructor(params: { reason?: string | null; action?: string | null }) {
    const reason = params.reason ?? 'Pollinations image provider is not ready'
    super(reason)
    this.name = 'V7ImageProviderNotReadyError'
    this.reason = reason
    this.action = params.action ?? 'Retry later or set POLLINATIONS_API_KEY if required.'
  }
}

export class V7AllImageProvidersFailedError extends Error {
  readonly code: V7ImageProviderErrorCode = 'ALL_PROVIDERS_FAILED'
  readonly failures: Array<{
    provider: V7ImageProviderId
    code: V7ImageProviderErrorCode
    message?: string
  }>

  constructor(
    failures: Array<{
      provider: V7ImageProviderId
      code: V7ImageProviderErrorCode
      message?: string
    }>
  ) {
    super('ALL_PROVIDERS_FAILED')
    this.name = 'V7AllImageProvidersFailedError'
    this.failures = failures
  }
}

export class V7ImagePromptValidationError extends Error {
  readonly code = 'IMAGE_PROMPT_VALIDATION_FAILED' as const
  readonly provider = 'pollinations' as const
  readonly sceneNumber: number
  readonly missingRequirements: string[]
  readonly forbiddenTermsFound: string[]
  readonly finalPrompt: string
  readonly negativePrompt: string
  readonly score: number

  constructor(params: {
    sceneNumber: number
    missingRequirements: string[]
    forbiddenTermsFound: string[]
    finalPrompt: string
    negativePrompt: string
    score: number
  }) {
    super(
      `IMAGE_PROMPT_VALIDATION_FAILED scene ${params.sceneNumber}: score ${params.score}/100`
    )
    this.name = 'V7ImagePromptValidationError'
    this.sceneNumber = params.sceneNumber
    this.missingRequirements = params.missingRequirements
    this.forbiddenTermsFound = params.forbiddenTermsFound
    this.finalPrompt = params.finalPrompt
    this.negativePrompt = params.negativePrompt
    this.score = params.score
  }
}

export function classifyV7ImageUnknownError(
  provider: V7ImageProviderId,
  err: unknown
): V7ImageProviderRequestError {
  if (err instanceof V7ImageProviderRequestError) return err

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const name = err instanceof Error ? err.name : ''

  if (name === 'AbortError' || message.includes('timeout') || message.includes('aborted')) {
    return new V7ImageProviderRequestError('PROVIDER_TIMEOUT', provider, {
      message: 'Image provider request timed out',
      cause: err,
    })
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return new V7ImageProviderRequestError('PROVIDER_AUTH_FAILED', provider, { cause: err })
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return new V7ImageProviderRequestError('PROVIDER_RATE_LIMITED', provider, { cause: err })
  }

  const httpStatus =
    err && typeof err === 'object' && 'httpStatus' in err
      ? (err as { httpStatus?: number }).httpStatus
      : undefined
  const errorCode =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : ''

  if (
    httpStatus === 402 ||
    errorCode === 'POLLINATIONS_CREDITS_EXHAUSTED' ||
    errorCode === 'POLLINATIONS_CREDITS_REQUIRED' ||
    message.includes('402') ||
    message.includes('pollinations_credits_exhausted') ||
    message.includes('pollinations_credits_required') ||
    message.includes('pollen_insufficient') ||
    message.includes('insufficient pollen') ||
    message.includes('insufficient balance')
  ) {
    return new V7ImageProviderRequestError('PROVIDER_QUOTA_EXCEEDED', provider, {
      message: err instanceof Error ? err.message : String(err),
      httpStatus: httpStatus ?? 402,
      cause: err,
    })
  }

  if (message.includes('no image') || message.includes('empty') || message.includes('invalid')) {
    return new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, { cause: err })
  }

  return new V7ImageProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isV7ImageRetryableError(err: unknown): boolean {
  if (err instanceof V7ImagePromptValidationError) return false
  if (!(err instanceof V7ImageProviderRequestError)) return false
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  if (err.code === 'PROVIDER_QUOTA_EXCEEDED') return false
  return true
}
