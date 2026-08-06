import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyV7HttpError,
  isV7RetryableError,
  V7AllProvidersFailedError,
} from '@/lib/v7/providers/text-errors'

describe('V7 provider error classification', () => {
  it('classifies 402 insufficient credits as quota exceeded', () => {
    const err = classifyV7HttpError(
      'openrouter-qwen',
      402,
      '{"error":{"message":"Insufficient credits. Purchase at openrouter.ai/settings/credits"}}'
    )
    assert.equal(err.code, 'PROVIDER_QUOTA_EXCEEDED')
    assert.equal(err.httpStatus, 402)
    assert.match(err.message, /Insufficient credits/i)
    assert.equal(isV7RetryableError(err), false)
  })

  it('classifies 429 rate limit as retryable', () => {
    const err = classifyV7HttpError('groq', 429, 'rate limit exceeded')
    assert.equal(err.code, 'PROVIDER_RATE_LIMITED')
    assert.equal(isV7RetryableError(err), true)
  })

  it('classifies auth failures as non-retryable', () => {
    const err = classifyV7HttpError('openrouter-qwen', 401, 'invalid key')
    assert.equal(err.code, 'PROVIDER_AUTH_FAILED')
    assert.equal(isV7RetryableError(err), false)
  })

  it('classifies 400 as non-retryable invalid request', () => {
    const err = classifyV7HttpError('together', 400, 'unsupported model')
    assert.equal(err.code, 'PROVIDER_INVALID_RESPONSE')
    assert.equal(isV7RetryableError(err), false)
  })

  it('aggregates all provider failures', () => {
    const err = new V7AllProvidersFailedError([
      { provider: 'openrouter-qwen', code: 'PROVIDER_RATE_LIMITED' },
      { provider: 'groq', code: 'PROVIDER_UNAVAILABLE' },
    ])
    assert.equal(err.code, 'ALL_PROVIDERS_FAILED')
    assert.equal(err.failures.length, 2)
  })
})
