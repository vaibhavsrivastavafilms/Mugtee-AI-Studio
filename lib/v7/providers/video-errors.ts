import type { V7VideoProviderId } from '@/lib/v7/providers/video-provider.types'

export type V7VideoProviderErrorCode =
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
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

  constructor(
    failures: Array<{
      provider: V7VideoProviderId
      code: V7VideoProviderErrorCode
      message?: string
    }>
  ) {
    super('ALL_PROVIDERS_FAILED')
    this.name = 'V7AllVideoProvidersFailedError'
    this.failures = failures
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

  if (message.includes('no video') || message.includes('empty') || message.includes('invalid')) {
    return new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, { cause: err })
  }

  return new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isV7VideoRetryableError(err: unknown): boolean {
  if (!(err instanceof V7VideoProviderRequestError)) return false
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  return true
}
