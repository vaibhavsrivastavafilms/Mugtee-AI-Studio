import 'server-only'

export type TextProviderErrorCode =
  | 'TEXT_PROVIDER_NOT_READY'
  | 'TEXT_PROVIDER_NOT_CONFIGURED'
  | 'TEXT_PROVIDER_INVALID_RESPONSE'
  | 'OPENROUTER_AUTH_FAILED'
  | 'OPENROUTER_MODEL_RATE_LIMITED'
  | 'OPENROUTER_MODEL_UNAVAILABLE'
  | 'OPENROUTER_NO_AVAILABLE_FREE_MODEL'
  | 'NO_FREE_TEXT_MODEL_AVAILABLE'
  | 'OPENROUTER_API_UNAVAILABLE'

export type ActiveTextProviderId = 'openrouter'

export class TextProviderError extends Error {
  readonly code: TextProviderErrorCode
  readonly provider: ActiveTextProviderId
  readonly httpStatus?: number
  readonly retryCount?: number
  readonly model?: string
  readonly attemptedModels?: string[]
  /** Internal flag — router should try the next free model. */
  readonly failover?: boolean

  constructor(
    code: TextProviderErrorCode,
    provider: ActiveTextProviderId,
    options?: {
      httpStatus?: number
      message?: string
      cause?: unknown
      retryCount?: number
      model?: string
      attemptedModels?: string[]
      failover?: boolean
    }
  ) {
    super(options?.message ?? code)
    this.name = 'TextProviderError'
    this.code = code
    this.provider = provider
    this.httpStatus = options?.httpStatus
    this.retryCount = options?.retryCount
    this.model = options?.model
    this.attemptedModels = options?.attemptedModels
    this.failover = options?.failover
    if (options?.cause) this.cause = options.cause
  }
}

export class TextProviderNotConfiguredError extends TextProviderError {
  constructor(message?: string) {
    super('TEXT_PROVIDER_NOT_CONFIGURED', 'openrouter', {
      message: message ?? 'OPENROUTER_API_KEY is required for text generation',
    })
    this.name = 'TextProviderNotConfiguredError'
  }
}

export function isTextProviderRetryable(_err: unknown): boolean {
  return false
}
