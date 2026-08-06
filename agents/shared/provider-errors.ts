export type ProviderErrorCode =
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'ALL_PROVIDERS_FAILED'

export type TextLlmProviderId = 'openai' | 'gemini'

export class ProviderRequestError extends Error {
  readonly code: ProviderErrorCode
  readonly provider: TextLlmProviderId
  readonly httpStatus?: number

  constructor(
    code: ProviderErrorCode,
    provider: TextLlmProviderId,
    options?: { httpStatus?: number; message?: string; cause?: unknown }
  ) {
    super(options?.message ?? code)
    this.name = 'ProviderRequestError'
    this.code = code
    this.provider = provider
    this.httpStatus = options?.httpStatus
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

export class AllProvidersFailedError extends Error {
  readonly code: ProviderErrorCode = 'ALL_PROVIDERS_FAILED'
  readonly failures: Array<{ provider: TextLlmProviderId; code: ProviderErrorCode }>

  constructor(failures: Array<{ provider: TextLlmProviderId; code: ProviderErrorCode }>) {
    super('ALL_PROVIDERS_FAILED')
    this.name = 'AllProvidersFailedError'
    this.failures = failures
  }
}

const QUOTA_HINTS = ['quota', 'billing', 'exceeded your current quota', 'insufficient_quota']

export function classifyHttpProviderError(
  provider: TextLlmProviderId,
  status: number,
  body = ''
): ProviderRequestError {
  const lower = body.toLowerCase()

  if (status === 429) {
    const code = QUOTA_HINTS.some((hint) => lower.includes(hint))
      ? 'PROVIDER_QUOTA_EXCEEDED'
      : 'PROVIDER_RATE_LIMITED'
    return new ProviderRequestError(code, provider, { httpStatus: status })
  }

  if (status === 401 || status === 403) {
    return new ProviderRequestError('PROVIDER_AUTH_FAILED', provider, { httpStatus: status })
  }

  if (status === 408 || status === 504) {
    return new ProviderRequestError('PROVIDER_TIMEOUT', provider, { httpStatus: status })
  }

  if (status >= 500) {
    return new ProviderRequestError('PROVIDER_UNAVAILABLE', provider, { httpStatus: status })
  }

  return new ProviderRequestError('PROVIDER_UNAVAILABLE', provider, { httpStatus: status })
}

export function classifyUnknownProviderError(
  provider: TextLlmProviderId,
  err: unknown
): ProviderRequestError {
  if (err instanceof ProviderRequestError) return err

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const name = err instanceof Error ? err.name : ''

  if (name === 'AbortError' || message.includes('timeout') || message.includes('aborted')) {
    return new ProviderRequestError('PROVIDER_TIMEOUT', provider, {
      message: 'Provider request timed out',
      cause: err,
    })
  }

  if (message.includes('quota') || message.includes('billing')) {
    return new ProviderRequestError('PROVIDER_QUOTA_EXCEEDED', provider, { cause: err })
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return new ProviderRequestError('PROVIDER_AUTH_FAILED', provider, { cause: err })
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return new ProviderRequestError('PROVIDER_RATE_LIMITED', provider, { cause: err })
  }

  return new ProviderRequestError('PROVIDER_UNAVAILABLE', provider, { cause: err })
}

export function isRetryableProviderError(err: unknown): boolean {
  if (!(err instanceof ProviderRequestError)) return false
  if (err.code === 'PROVIDER_AUTH_FAILED') return false
  if (err.code === 'PROVIDER_INVALID_RESPONSE') return false
  return true
}

export function isProviderFallbackCandidate(err: unknown): boolean {
  return err instanceof ProviderRequestError
}
