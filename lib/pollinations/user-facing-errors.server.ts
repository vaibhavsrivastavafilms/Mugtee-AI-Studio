import 'server-only'

import type { PollinationsAuthSource } from '@/lib/pollinations/auth-context.server'
import { PollinationsError, isPollinationsError } from '@/lib/pollinations/errors.server'

export type PollinationsUserErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'POLLEN_INSUFFICIENT'
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_PROVIDER_ERROR'

const USER_MESSAGES: Record<PollinationsUserErrorCode, string> = {
  POLLEN_INSUFFICIENT:
    'Your Pollinations balance is insufficient for this generation. Connect another Pollinations account or add Pollen.',
  PROVIDER_UNAVAILABLE:
    'Pollinations is temporarily unavailable. No media was regenerated.',
  AUTH_REQUIRED: 'Connect your Pollinations account in Settings to use your own Pollen for generations.',
  AUTH_EXPIRED: 'Your Pollinations connection has expired. Reconnect Pollinations to continue.',
  RATE_LIMITED: 'Pollinations rate limit reached. Wait a moment and retry.',
  MODEL_UNAVAILABLE: 'The requested Pollinations model is unavailable. Try again later or contact support.',
  INVALID_REQUEST: 'Pollinations rejected this generation request. Adjust the prompt and retry.',
  UNKNOWN_PROVIDER_ERROR: 'Pollinations generation failed. No completed stages were changed.',
}

export function pollinationsUserMessage(code: PollinationsUserErrorCode): string {
  return USER_MESSAGES[code]
}

export function mapPollinationsErrorToUserCode(
  err: unknown,
  source?: PollinationsAuthSource
): PollinationsUserErrorCode {
  if (!isPollinationsError(err)) return 'UNKNOWN_PROVIDER_ERROR'

  if (err.code === 'POLLINATIONS_API_KEY_REQUIRED') {
    return 'AUTH_REQUIRED'
  }

  if (err.code === 'POLLINATIONS_AUTH_FAILED') {
    if (source === 'user_byop' || err.message.toLowerCase().includes('expired')) {
      return 'AUTH_EXPIRED'
    }
    return 'AUTH_REQUIRED'
  }

  if (
    err.code === 'POLLINATIONS_CREDITS_EXHAUSTED' ||
    err.code === 'POLLINATIONS_CREDITS_REQUIRED'
  ) {
    return 'POLLEN_INSUFFICIENT'
  }

  if (err.code === 'POLLINATIONS_RATE_LIMITED') return 'RATE_LIMITED'
  if (err.code === 'POLLINATIONS_MODEL_UNAVAILABLE') return 'MODEL_UNAVAILABLE'

  if (
    err.code === 'POLLINATIONS_INPUT_REJECTED' ||
    err.code === 'POLLINATIONS_IMAGE_URL_INVALID'
  ) {
    return 'INVALID_REQUEST'
  }

  if (
    err.code === 'POLLINATIONS_SERVER_ERROR' ||
    err.code === 'POLLINATIONS_TIMEOUT' ||
    err.code === 'POLLINATIONS_UNKNOWN_ERROR'
  ) {
    return 'PROVIDER_UNAVAILABLE'
  }

  return 'UNKNOWN_PROVIDER_ERROR'
}

export function enrichPollinationsInsufficientError(
  err: PollinationsError,
  params: {
    capability: 'image' | 'video' | 'audio'
    balance?: number | null
    required?: number | null
    source?: PollinationsAuthSource
  }
): PollinationsError {
  if (
    err.code !== 'POLLINATIONS_CREDITS_EXHAUSTED' &&
    err.code !== 'POLLINATIONS_CREDITS_REQUIRED'
  ) {
    return err
  }

  const parts = [
    'POLLEN_INSUFFICIENT',
    `provider=pollinations`,
    `capability=${params.capability}`,
  ]
  if (params.required != null) parts.push(`required=${params.required.toFixed(4)}`)
  if (params.balance != null) parts.push(`balance=${params.balance.toFixed(4)}`)
  if (params.source) parts.push(`billing=${params.source}`)

  return new PollinationsError({
    code: err.code,
    message: parts.join(' · '),
    httpStatus: err.httpStatus ?? 402,
    model: err.model,
    sceneNumber: err.sceneNumber,
    action: pollinationsUserMessage('POLLEN_INSUFFICIENT'),
    retryable: false,
  })
}
