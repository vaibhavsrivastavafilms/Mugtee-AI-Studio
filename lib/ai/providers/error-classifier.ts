import type { ProviderErrorKind } from '@/lib/ai/providers/provider-diagnostics.types'

export type ClassifiedProviderError = {
  kind: ProviderErrorKind
  httpStatus: number | null
  message: string
  retryable: boolean
  reason: string
}

const HTTP_RE = /\bHTTP\s+(\d{3})\b/i

function extractHttpStatus(message: string): number | null {
  const match = HTTP_RE.exec(message)
  if (match) return Number(match[1])
  if (/\b401\b/.test(message)) return 401
  if (/\b402\b/.test(message)) return 402
  if (/\b429\b/.test(message)) return 429
  if (/\b404\b/.test(message)) return 404
  if (/\b500\b/.test(message)) return 500
  if (/\b503\b/.test(message)) return 503
  return null
}

/** Classify raw provider errors for routing, UI, and retry policy. */
export function classifyProviderError(err: unknown): ClassifiedProviderError {
  const message = err instanceof Error ? err.message : String(err ?? 'unknown error')
  const lower = message.toLowerCase()
  const httpStatus = extractHttpStatus(message)

  if (lower.includes('cooldown') || lower.includes('unhealthy')) {
    return {
      kind: 'cooldown_skip',
      httpStatus,
      message,
      retryable: true,
      reason: 'Provider in cooldown — retry shortly',
    }
  }

  if (httpStatus === 401 || /invalid.*api.*key|authentication|unauthorized/i.test(message)) {
    return {
      kind: 'invalid_api_key',
      httpStatus: httpStatus ?? 401,
      message,
      retryable: false,
      reason: 'Invalid API key',
    }
  }

  if (
    httpStatus === 402 ||
    /insufficient.*quota|quota exceeded|billing|payment required|credit/i.test(lower)
  ) {
    return {
      kind: 'quota_exceeded',
      httpStatus: httpStatus ?? 402,
      message,
      retryable: false,
      reason: 'Quota exceeded',
    }
  }

  if (
    httpStatus === 429 ||
    /rate.?limit|too many requests|resource exhausted/i.test(lower)
  ) {
    return {
      kind: 'rate_limit',
      httpStatus: httpStatus ?? 429,
      message,
      retryable: true,
      reason: 'Rate limited',
    }
  }

  if (/timed out|timeout|deadline exceeded|abort/i.test(lower)) {
    return {
      kind: 'timeout',
      httpStatus,
      message,
      retryable: true,
      reason: 'Request timed out',
    }
  }

  if (
    /fetch failed|network|econnrefused|enotfound|socket|dns|connection reset/i.test(lower)
  ) {
    return {
      kind: 'network',
      httpStatus,
      message,
      retryable: true,
      reason: 'Network error',
    }
  }

  if (
    /empty hook|empty script|echo_or_empty|json|parse|malformed|invalid json/i.test(lower)
  ) {
    return {
      kind: 'malformed_response',
      httpStatus,
      message,
      retryable: true,
      reason: 'Malformed or empty model response',
    }
  }

  if (
    httpStatus === 404 ||
    /model.*not found|no endpoints|not available|deprecated/i.test(lower)
  ) {
    return {
      kind: 'model_unavailable',
      httpStatus: httpStatus ?? 404,
      message,
      retryable: false,
      reason: 'Model unavailable',
    }
  }

  if (httpStatus != null && httpStatus >= 500) {
    return {
      kind: 'provider_internal',
      httpStatus,
      message,
      retryable: true,
      reason: 'Provider internal error',
    }
  }

  return {
    kind: 'unknown',
    httpStatus,
    message,
    retryable: true,
    reason: message.slice(0, 120) || 'Provider error',
  }
}

export function isNonRetryableClassified(error: ClassifiedProviderError): boolean {
  return !error.retryable
}
