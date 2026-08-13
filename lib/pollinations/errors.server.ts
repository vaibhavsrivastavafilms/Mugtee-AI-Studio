import 'server-only'

export type PollinationsErrorCode =
  | 'POLLINATIONS_AUTH_FAILED'
  | 'POLLINATIONS_API_KEY_REQUIRED'
  | 'POLLINATIONS_CREDITS_EXHAUSTED'
  | 'POLLINATIONS_CREDITS_REQUIRED'
  | 'POLLINATIONS_MODEL_UNAVAILABLE'
  | 'POLLINATIONS_MODEL_I2V_UNSUPPORTED'
  | 'POLLINATIONS_INPUT_REJECTED'
  | 'POLLINATIONS_IMAGE_NOT_ACCESSIBLE'
  | 'POLLINATIONS_TIMEOUT'
  | 'POLLINATIONS_SERVER_ERROR'
  | 'POLLINATIONS_UNKNOWN_ERROR'
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
  readonly responseBody?: string
  readonly requestId?: string
  readonly durationSec?: number
  readonly width?: number
  readonly height?: number
  readonly retryable: boolean

  constructor(params: {
    code: PollinationsErrorCode
    message: string
    stage?: string
    sceneNumber?: number
    httpStatus?: number
    model?: string
    action?: string
    responseBody?: string
    requestId?: string
    durationSec?: number
    width?: number
    height?: number
    retryable?: boolean
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
    this.responseBody = params.responseBody
    this.requestId = params.requestId
    this.durationSec = params.durationSec
    this.width = params.width
    this.height = params.height
    this.retryable = params.retryable ?? false
    if (params.cause) this.cause = params.cause
  }
}

export function isPollinationsError(err: unknown): err is PollinationsError {
  return err instanceof PollinationsError
}
