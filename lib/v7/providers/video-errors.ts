import type {
  V7VideoProviderCapabilityReport,
  V7VideoProviderId,
} from '@/lib/v7/providers/video-provider.types'

export type V7VideoProviderErrorCode =
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_UNHEALTHY'
  | 'ALL_PROVIDERS_FAILED'

export class V7VideoProviderRequestError extends Error {
  readonly code: V7VideoProviderErrorCode
  readonly provider: V7VideoProviderId
  readonly httpStatus?: number

  constructor(
    code: V7VideoProviderErrorCode,
    provider: V7VideoProviderId,
    options?: { httpStatus?: number; message?: string; cause?: unknown }
  ) {
    super(options?.message ?? code)
    this.name = 'V7VideoProviderRequestError'
    this.code = code
    this.provider = provider
    this.httpStatus = options?.httpStatus
    if (options?.cause) this.cause = options.cause
  }
}

export class V7AllVideoProvidersFailedError extends Error {
  readonly code: V7VideoProviderErrorCode = 'ALL_PROVIDERS_FAILED'
  readonly failures: Array<{
    provider: V7VideoProviderId
    code: V7VideoProviderErrorCode
    message?: string
  }>
  readonly evaluations: V7VideoProviderCapabilityReport[]

  constructor(
    failures: Array<{
      provider: V7VideoProviderId
      code: V7VideoProviderErrorCode
      message?: string
    }>,
    evaluations: V7VideoProviderCapabilityReport[] = []
  ) {
    super('ALL_PROVIDERS_FAILED')
    this.name = 'V7AllVideoProvidersFailedError'
    this.failures = failures
    this.evaluations = evaluations
  }
}

export class V7VideoProviderNotReadyError extends Error {
  readonly code = 'VIDEO_PROVIDER_NOT_READY' as const
  readonly provider = 'pollinations' as const
  readonly reason: string
  readonly action: string

  constructor(snapshot: {
    reason?: string | null
    action?: string | null
    selectedModel?: string | null
  }) {
    const reason = snapshot.reason ?? 'Pollinations video provider is not ready'
    super(reason)
    this.name = 'V7VideoProviderNotReadyError'
    this.reason = reason
    this.action = snapshot.action ?? 'Add POLLINATIONS_API_KEY and ensure sufficient Pollen balance.'
  }
}

export class V7VideoProviderCapabilityBlockedError extends Error {
  readonly code = 'VIDEO_PROVIDER_NOT_READY' as const
  readonly evaluations: V7VideoProviderCapabilityReport[]
  readonly sceneNumber?: number
  readonly executionFailures?: Array<{
    provider: V7VideoProviderId
    code: V7VideoProviderErrorCode
    message?: string
    stack?: string
  }>

  constructor(
    evaluations: V7VideoProviderCapabilityReport[],
    options?: {
      sceneNumber?: number
      executionFailures?: Array<{
        provider: V7VideoProviderId
        code: V7VideoProviderErrorCode
        message?: string
        stack?: string
      }>
    }
  ) {
    super('VIDEO_PROVIDER_NOT_READY')
    this.name = 'V7VideoProviderCapabilityBlockedError'
    this.evaluations = evaluations
    this.sceneNumber = options?.sceneNumber
    this.executionFailures = options?.executionFailures
  }
}

export function classifyV7VideoUnknownError(
  provider: V7VideoProviderId,
  err: unknown
): V7VideoProviderRequestError {
  if (err instanceof V7VideoProviderRequestError) return err

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const name = err instanceof Error ? err.name : ''

  if (name === 'AbortError' || message.includes('timeout') || message.includes('aborted')) {
    return new V7VideoProviderRequestError('PROVIDER_TIMEOUT', provider, {
      message: 'Video provider request timed out',
      cause: err,
    })
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', provider, { cause: err })
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return new V7VideoProviderRequestError('PROVIDER_RATE_LIMITED', provider, { cause: err })
  }

  if (
    message.includes('402') ||
    message.includes('pollinations_credits_exhausted') ||
    message.includes('pollinations_credits_required') ||
    message.includes('insufficient pollen') ||
    message.includes('insufficient balance')
  ) {
    return new V7VideoProviderRequestError('PROVIDER_QUOTA_EXCEEDED', provider, {
      message: err instanceof Error ? err.message : String(err),
      cause: err,
    })
  }

  if (message.includes('no video') || message.includes('empty') || message.includes('invalid')) {
    return new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, { cause: err })
  }

  return new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isV7VideoRetryableError(err: unknown): boolean {
  if (!(err instanceof V7VideoProviderRequestError)) return false

  const cause = err.cause
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    ((cause as { code: unknown }).code === 'WAN_MODEL_NOT_ENABLED' ||
      (cause as { code: unknown }).code === 'MODEL_NOT_AVAILABLE')
  ) {
    return false
  }
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    typeof (cause as { code: unknown }).code === 'string' &&
    ((cause as { code: string }).code.startsWith('POLLINATIONS_') &&
      (cause as { code: string }).code !== 'POLLINATIONS_RATE_LIMITED' &&
      (cause as { code: string }).code !== 'POLLINATIONS_SERVER_ERROR' &&
      (cause as { code: string }).code !== 'POLLINATIONS_TIMEOUT')
  ) {
    return false
  }
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  if (err.code === 'PROVIDER_QUOTA_EXCEEDED') return false
  if (
    cause &&
    typeof cause === 'object' &&
    'retryable' in cause &&
    typeof (cause as { retryable: unknown }).retryable === 'boolean'
  ) {
    return (cause as { retryable: boolean }).retryable
  }
  return err.code === 'PROVIDER_RATE_LIMITED' || err.code === 'PROVIDER_TIMEOUT' || err.code === 'PROVIDER_UNAVAILABLE'
}
