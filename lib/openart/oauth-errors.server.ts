import 'server-only'

export type OpenArtOAuthErrorCode =
  | 'OPENART_MISSING_CODE'
  | 'OPENART_INVALID_STATE'
  | 'OPENART_MISSING_PKCE'
  | 'OPENART_CLIENT_REGISTRATION_FAILED'
  | 'OPENART_TOKEN_EXCHANGE_FAILED'
  | 'OPENART_TOKEN_PERSIST_FAILED'
  | 'OPENART_STATUS_READ_FAILED'
  | 'OPENART_NOT_AUTHENTICATED'

export class OpenArtOAuthError extends Error {
  readonly code: OpenArtOAuthErrorCode
  readonly provider = 'openart' as const
  readonly requestId?: string
  readonly details?: Record<string, unknown>

  constructor(
    code: OpenArtOAuthErrorCode,
    message: string,
    options?: { requestId?: string; details?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message)
    this.name = 'OpenArtOAuthError'
    this.code = code
    this.requestId = options?.requestId
    this.details = options?.details
    if (options?.cause) this.cause = options.cause
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      provider: this.provider,
      ...(this.requestId ? { requestId: this.requestId } : {}),
      ...(this.details ?? {}),
    }
  }
}

export function isOpenArtOAuthError(err: unknown): err is OpenArtOAuthError {
  return err instanceof OpenArtOAuthError
}
