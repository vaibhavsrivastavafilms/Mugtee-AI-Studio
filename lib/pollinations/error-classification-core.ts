/**
 * Pure Pollinations HTTP error classification — no network, no secrets.
 */

export type PollinationsHttpErrorCode =
  | 'POLLINATIONS_AUTH_FAILED'
  | 'POLLINATIONS_CREDITS_EXHAUSTED'
  | 'POLLINATIONS_CREDITS_REQUIRED'
  | 'POLLINATIONS_RATE_LIMITED'
  | 'POLLINATIONS_INPUT_REJECTED'
  | 'POLLINATIONS_MODEL_UNAVAILABLE'
  | 'POLLINATIONS_MODEL_I2V_UNSUPPORTED'
  | 'POLLINATIONS_IMAGE_NOT_ACCESSIBLE'
  | 'POLLINATIONS_TIMEOUT'
  | 'POLLINATIONS_SERVER_ERROR'
  | 'POLLINATIONS_UNKNOWN_ERROR'
  | 'POLLINATIONS_IMAGE_FAILED'
  | 'POLLINATIONS_VIDEO_GENERATION_FAILED'
  | 'POLLINATIONS_GENERATION_FAILED'

export type PollinationsHttpErrorClassification = {
  code: PollinationsHttpErrorCode
  message: string
  retryable: boolean
}

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504])

export function sanitizePollinationsResponseBody(bodyText?: string, maxLength = 2_000): string | undefined {
  if (!bodyText?.trim()) return undefined
  const redacted = bodyText
    .replace(/Bearer\s+sk_[A-Za-z0-9_-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk_[A-Za-z0-9_-]{8,}/g, '[REDACTED_KEY]')
    .replace(/"key"\s*:\s*"[^"]+"/gi, '"key":"[REDACTED]"')
    .trim()
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}…` : redacted
}

export function extractPollinationsRequestId(bodyText?: string): string | undefined {
  if (!bodyText) return undefined
  const jsonMatch = /"request[_-]?id"\s*:\s*"([^"]+)"/i.exec(bodyText)
  if (jsonMatch?.[1]) return jsonMatch[1]
  const headerLike = /request[_-]?id[:=]\s*([A-Za-z0-9-]+)/i.exec(bodyText)
  return headerLike?.[1]
}

function bodyIndicatesInputRejection(bodyText?: string): boolean {
  if (!bodyText) return false
  const lower = bodyText.toLowerCase()
  return (
    lower.includes('input rejected') ||
    lower.includes('invalid input') ||
    lower.includes('invalid parameter') ||
    lower.includes('validation failed') ||
    lower.includes('content policy') ||
    lower.includes('safety') ||
    lower.includes('moderation') ||
    lower.includes('not allowed')
  )
}

function bodyIndicatesImageAccess(bodyText?: string): boolean {
  if (!bodyText) return false
  const lower = bodyText.toLowerCase()
  return (
    lower.includes('image url') ||
    lower.includes('image not accessible') ||
    lower.includes('failed to fetch image') ||
    lower.includes('could not download image') ||
    lower.includes('unable to fetch image')
  )
}

function bodyIndicatesI2vUnsupported(bodyText?: string): boolean {
  if (!bodyText) return false
  const lower = bodyText.toLowerCase()
  return (
    lower.includes('image-to-video') ||
    lower.includes('image to video') ||
    lower.includes('i2v') ||
    lower.includes('does not support image')
  )
}

export function classifyPollinationsHttpError(params: {
  httpStatus: number
  capability: 'image' | 'video' | 'audio'
  model: string
  bodyText?: string
}): PollinationsHttpErrorClassification {
  const { httpStatus, capability, model, bodyText } = params
  const sanitizedBody = sanitizePollinationsResponseBody(bodyText)
  const detailSuffix = sanitizedBody ? ` — ${sanitizedBody}` : ''

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      code: 'POLLINATIONS_AUTH_FAILED',
      message: `Pollinations authentication failed (HTTP ${httpStatus})${detailSuffix}`,
      retryable: false,
    }
  }

  if (httpStatus === 402) {
    return {
      code: 'POLLINATIONS_CREDITS_EXHAUSTED',
      message: `Insufficient Pollen balance (HTTP ${httpStatus})${detailSuffix}`,
      retryable: false,
    }
  }

  if (httpStatus === 429) {
    return {
      code: 'POLLINATIONS_RATE_LIMITED',
      message: `Pollinations rate limited (HTTP ${httpStatus})${detailSuffix}`,
      retryable: true,
    }
  }

  if (httpStatus === 404) {
    return {
      code: 'POLLINATIONS_MODEL_UNAVAILABLE',
      message: `Pollinations ${capability} model unavailable: ${model} (HTTP ${httpStatus})${detailSuffix}`,
      retryable: false,
    }
  }

  if (httpStatus === 408 || httpStatus === 504) {
    return {
      code: 'POLLINATIONS_TIMEOUT',
      message: `Pollinations ${capability} timed out (HTTP ${httpStatus})${detailSuffix}`,
      retryable: true,
    }
  }

  if (httpStatus === 400 || httpStatus === 409 || httpStatus === 422) {
    if (bodyIndicatesImageAccess(bodyText)) {
      return {
        code: 'POLLINATIONS_IMAGE_NOT_ACCESSIBLE',
        message: `Pollinations could not access storyboard image (HTTP ${httpStatus})${detailSuffix}`,
        retryable: false,
      }
    }
    if (bodyIndicatesI2vUnsupported(bodyText)) {
      return {
        code: 'POLLINATIONS_MODEL_I2V_UNSUPPORTED',
        message: `Pollinations model ${model} does not support image-to-video (HTTP ${httpStatus})${detailSuffix}`,
        retryable: false,
      }
    }
    return {
      code: 'POLLINATIONS_INPUT_REJECTED',
      message: `Pollinations rejected ${capability} input (HTTP ${httpStatus})${detailSuffix}`,
      retryable: false,
    }
  }

  if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503) {
    return {
      code: 'POLLINATIONS_SERVER_ERROR',
      message: `Pollinations ${capability} server error (HTTP ${httpStatus})${detailSuffix}`,
      retryable: true,
    }
  }

  const fallbackCode =
    capability === 'image'
      ? 'POLLINATIONS_IMAGE_FAILED'
      : capability === 'video'
        ? 'POLLINATIONS_VIDEO_GENERATION_FAILED'
        : 'POLLINATIONS_GENERATION_FAILED'

  return {
    code: fallbackCode,
    message: `Pollinations ${capability} failed (HTTP ${httpStatus})${detailSuffix}`,
    retryable: RETRYABLE_HTTP_STATUSES.has(httpStatus),
  }
}

export function isTerminalPollinationsErrorCode(code: string): boolean {
  return (
    code === 'POLLINATIONS_AUTH_FAILED' ||
    code === 'POLLINATIONS_CREDITS_EXHAUSTED' ||
    code === 'POLLINATIONS_CREDITS_REQUIRED' ||
    code === 'POLLINATIONS_INPUT_REJECTED' ||
    code === 'POLLINATIONS_MODEL_UNAVAILABLE' ||
    code === 'POLLINATIONS_MODEL_I2V_UNSUPPORTED' ||
    code === 'POLLINATIONS_IMAGE_NOT_ACCESSIBLE' ||
    code === 'POLLINATIONS_IMAGE_URL_INVALID' ||
    code === 'POLLINATIONS_VIDEO_INVALID'
  )
}
