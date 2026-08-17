import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyProviderError } from '@/lib/ai/providers/error-classifier'

test('402 quota errors fail over to next provider in router', () => {
  const classified = classifyProviderError(new Error('OpenRouter HTTP 402: insufficient credits'))
  assert.equal(classified.httpStatus, 402)
  assert.equal(classified.retryable, false)
})

test('429 rate limit errors are classified for provider retry/failover', () => {
  const classified = classifyProviderError(new Error('OpenRouter HTTP 429: rate limit exceeded'))
  assert.equal(classified.httpStatus, 429)
  assert.equal(classified.retryable, true)
})

test('503 upstream errors are classified as retryable provider failures', () => {
  const classified = classifyProviderError(new Error('OpenRouter HTTP 503: upstream unavailable'))
  assert.equal(classified.httpStatus, 503)
  assert.equal(classified.retryable, true)
})
