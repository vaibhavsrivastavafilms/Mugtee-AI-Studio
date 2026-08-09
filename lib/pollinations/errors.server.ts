import 'server-only'

export type PollinationsErrorCode =
  | 'POLLINATIONS_AUTH_FAILED'
  | 'POLLINATIONS_CREDITS_EXHAUSTED'
  | 'POLLINATIONS_CREDITS_REQUIRED'
  | 'POLLINATIONS_MODEL_UNAVAILABLE'
  | 'POLLINATIONS_GENERATION_FAILED'
  | 'POLLINATIONS_IMAGE_FAILED'
  | 'POLLINATIONS_IMAGE_URL_INVALID'
  | 'POLLINATIONS_VIDEO_GENERATION_FAILED'
  | 'POLLINATIONS_VIDEO_INVALID'
  | 'POLLINATIONS_RATE_LIMITED'
  | 'AUDIO_PROVIDER_NOT_AVAILABLE'

export class PollinationsError extends Error {
  readonly code: PollinationsErrorCode
  readonly provider = 'pollinations' as const
  readonly stage?: string
  readonly sceneNumber?: number
  readonly httpStatus?: number
  readonly model?: string
  readonly action?: string

  constructor(params: {
    code: PollinationsErrorCode
    message: string
    stage?: string
    sceneNumber?: number
    httpStatus?: number
    model?: string
    action?: string
    cause?: unknown
  }) {
    super(params.message)
    this.name = 'PollinationsError'
    this.code = params.code
    this.stage = params.stage
    this.sceneNumber = params.sceneNumber
    this.httpStatus = params.httpStatus
    this.model = params.model
    this.action = params.action
    if (params.cause) this.cause = params.cause
  }
}

export function isPollinationsError(err: unknown): err is PollinationsError {
  return err instanceof PollinationsError
}
