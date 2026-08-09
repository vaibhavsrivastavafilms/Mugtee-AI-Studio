import type { V7TextProviderId } from '@/lib/v7/providers/text-provider.types'

export type V7ProviderErrorCode =
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_UNHEALTHY'
  | 'ALL_PROVIDERS_FAILED'

const QUOTA_HINTS = ['quota', 'billing', 'exceeded your current quota', 'insufficient_quota', 'insufficient credits']

export function parseV7ProviderErrorBody(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  try {
    const json = JSON.parse(trimmed) as {
      error?: { message?: string; code?: number | string }
      message?: string
    }
    return (
      json.error?.message?.trim() ||
      json.message?.trim() ||
      trimmed.slice(0, 300)
    )
  } catch {
    return trimmed.slice(0, 300)
  }
}

export class V7ProviderRequestError extends Error {
  readonly code: V7ProviderErrorCode
  readonly provider: V7TextProviderId
  readonly httpStatus?: number

  constructor(
    code: V7ProviderErrorCode,
    provider: V7TextProviderId,
    options?: { httpStatus?: number; message?: string; cause?: unknown }
  ) {
    super(options?.message ?? code)
    this.name = 'V7ProviderRequestError'
    this.code = code
    this.provider = provider
    this.httpStatus = options?.httpStatus
    if (options?.cause) this.cause = options.cause
  }
}

export class V7AllProvidersFailedError extends Error {
  readonly code: V7ProviderErrorCode = 'ALL_PROVIDERS_FAILED'
  readonly failures: Array<{
    provider: V7TextProviderId
    code: V7ProviderErrorCode
    message?: string
  }>

  constructor(
    failures: Array<{
      provider: V7TextProviderId
      code: V7ProviderErrorCode
      message?: string
    }>
  ) {
    super('ALL_PROVIDERS_FAILED')
    this.name = 'V7AllProvidersFailedError'
    this.failures = failures
  }
}

export function classifyV7HttpError(
  provider: V7TextProviderId,
  status: number,
  body = ''
): V7ProviderRequestError {
  const lower = body.toLowerCase()
  const detail = parseV7ProviderErrorBody(body)

  if (status === 402) {
    return new V7ProviderRequestError('PROVIDER_QUOTA_EXCEEDED', provider, {
      httpStatus: status,
      message: detail || 'Insufficient provider credits',
    })
  }

  if (status === 429) {
    const code = QUOTA_HINTS.some((hint) => lower.includes(hint))
      ? 'PROVIDER_QUOTA_EXCEEDED'
      : 'PROVIDER_RATE_LIMITED'
    return new V7ProviderRequestError(code, provider, {
      httpStatus: status,
      message: detail || undefined,
    })
  }

  if (status === 401 || status === 403) {
    return new V7ProviderRequestError('PROVIDER_AUTH_FAILED', provider, {
      httpStatus: status,
      message: detail || 'Authentication failed',
    })
  }

  if (status === 400 || status === 404 || status === 422) {
    return new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
      httpStatus: status,
      message: detail || 'Invalid request',
    })
  }

  if (status === 408 || status === 504) {
    return new V7ProviderRequestError('PROVIDER_TIMEOUT', provider, {
      httpStatus: status,
      message: detail || undefined,
    })
  }

  if (status >= 500) {
    return new V7ProviderRequestError('PROVIDER_UNAVAILABLE', provider, {
      httpStatus: status,
      message: detail || 'Upstream service error',
    })
  }

  return new V7ProviderRequestError('PROVIDER_UNAVAILABLE', provider, {
    httpStatus: status,
    message: detail || `HTTP ${status}`,
  })
}

export function classifyV7UnknownError(
  provider: V7TextProviderId,
  err: unknown
): V7ProviderRequestError {
  if (err instanceof V7ProviderRequestError) return err

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const name = err instanceof Error ? err.name : ''

  if (name === 'AbortError' || message.includes('timeout') || message.includes('aborted')) {
    return new V7ProviderRequestError('PROVIDER_TIMEOUT', provider, {
      message: 'Provider request timed out',
      cause: err,
    })
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return new V7ProviderRequestError('PROVIDER_AUTH_FAILED', provider, { cause: err })
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return new V7ProviderRequestError('PROVIDER_RATE_LIMITED', provider, { cause: err })
  }

  return new V7ProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isV7RetryableError(err: unknown): boolean {
  if (!(err instanceof V7ProviderRequestError)) return false
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  if (err.code === 'PROVIDER_QUOTA_EXCEEDED') return false
  return true
}
