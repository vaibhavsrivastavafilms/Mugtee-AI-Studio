import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyPollinationsHttpError,
  isTerminalPollinationsErrorCode,
  sanitizePollinationsResponseBody,
} from '@/lib/pollinations/error-classification-core'
import {
  classifyV7VideoUnknownError,
  isV7VideoRetryableError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors'

describe('Pollinations HTTP error classification', () => {
  it('preserves raw Pollinations 422 body in classification message', () => {
    const result = classifyPollinationsHttpError({
      httpStatus: 422,
      capability: 'video',
      model: 'wan-fast',
      bodyText: '{"error":"prompt too long for model wan-fast"}',
    })
    assert.equal(result.code, 'POLLINATIONS_INPUT_REJECTED')
    assert.match(result.message, /422/)
    assert.match(result.message, /prompt too long/)
    assert.equal(result.retryable, false)
  })

  it('preserves raw Pollinations 503 body in classification message', () => {
    const result = classifyPollinationsHttpError({
      httpStatus: 503,
      capability: 'video',
      model: 'wan-fast',
      bodyText: 'upstream queue overloaded',
    })
    assert.equal(result.code, 'POLLINATIONS_SERVER_ERROR')
    assert.match(result.message, /503/)
    assert.match(result.message, /upstream queue overloaded/)
    assert.equal(result.retryable, true)
  })

  it('redacts api keys from response bodies', () => {
    const sanitized = sanitizePollinationsResponseBody(
      'Authorization failed for Bearer sk_test_secret_key_value_here'
    )
    assert.ok(sanitized)
    assert.doesNotMatch(sanitized!, /sk_test_secret_key_value_here/)
    assert.match(sanitized!, /REDACTED/)
  })

  it('marks INPUT_REJECTED as terminal', () => {
    assert.equal(isTerminalPollinationsErrorCode('POLLINATIONS_INPUT_REJECTED'), true)
    assert.equal(isTerminalPollinationsErrorCode('POLLINATIONS_SERVER_ERROR'), false)
  })
})

describe('V7 Pollinations retry policy', () => {
  it('does not retry INPUT_REJECTED mapped provider errors', () => {
    const pollinationsErr = {
      code: 'POLLINATIONS_INPUT_REJECTED',
      message: 'Pollinations rejected video input (HTTP 422) — bad prompt',
      httpStatus: 422,
      retryable: false,
    }
    const err = new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'pollinations', {
      message: `${pollinationsErr.code}: ${pollinationsErr.message}`,
      httpStatus: 422,
      cause: pollinationsErr,
    })
    assert.equal(isV7VideoRetryableError(err), false)
  })

  it('allows controlled retry for server errors', () => {
    const pollinationsErr = {
      code: 'POLLINATIONS_SERVER_ERROR',
      message: 'Pollinations video server error (HTTP 503)',
      httpStatus: 503,
      retryable: true,
    }
    const err = new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', 'pollinations', {
      message: `${pollinationsErr.code}: ${pollinationsErr.message}`,
      httpStatus: 503,
      cause: pollinationsErr,
    })
    assert.equal(isV7VideoRetryableError(err), true)
  })

  it('classifies INPUT_REJECTED as non-retryable terminal code', () => {
    assert.equal(isTerminalPollinationsErrorCode('POLLINATIONS_INPUT_REJECTED'), true)
    const classified = classifyPollinationsHttpError({
      httpStatus: 422,
      capability: 'video',
      model: 'wan-fast',
      bodyText: '{"reason":"input rejected"}',
    })
    assert.equal(classified.retryable, false)
    assert.equal(classified.code, 'POLLINATIONS_INPUT_REJECTED')
  })
})

describe('Pollinations diagnostic safety', () => {
  it('classifies unknown errors without implying generation occurred', () => {
    const err = classifyV7VideoUnknownError('pollinations', new Error('network down'))
    assert.equal(err.provider, 'pollinations')
    assert.notEqual(err.message, 'VIDEO_PROVIDER_NOT_READY')
  })
})
