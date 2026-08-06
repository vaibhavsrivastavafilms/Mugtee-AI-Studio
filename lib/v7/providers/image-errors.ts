import type { V7ImageProviderId } from '@/lib/v7/providers/image-provider.types'

export type V7ImageProviderErrorCode =
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_UNHEALTHY'
  | 'ALL_PROVIDERS_FAILED'

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

  if (message.includes('no image') || message.includes('empty') || message.includes('invalid')) {
    return new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, { cause: err })
  }

  return new V7ImageProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isV7ImageRetryableError(err: unknown): boolean {
  if (!(err instanceof V7ImageProviderRequestError)) return false
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  return true
}
