import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  estimatePollenCostForVideo,
  parsePollinationsPaymentRequired,
} from '@/lib/pollinations/entitlement-core'
import type { PollinationsModelInfo } from '@/lib/pollinations/models.server'
import {
  classifyV7VideoUnknownError,
  isV7VideoRetryableError,
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors'

describe('Pollinations entitlement helpers', () => {
  it('parses 402 payment-required bodies', () => {
    const parsed = parsePollinationsPaymentRequired(
      'Insufficient balance. This request costs ~0.4900 pollen, but your available balance is 0.0000.'
    )
    assert.equal(parsed.estimatedCost, 0.49)
    assert.equal(parsed.availableBalance, 0)
  })

  it('estimates per-second video pollen cost', () => {
    const model: PollinationsModelInfo = {
      id: 'wan-fast',
      type: 'video',
      supportsImageToVideo: true,
      questEligible: false,
      pollenCost: 0.01,
    }
    assert.equal(estimatePollenCostForVideo(model, 5), 0.05)
  })
})

describe('Pollinations retry and video error classification', () => {
  it('does not retry PROVIDER_QUOTA_EXCEEDED', () => {
    const err = new V7VideoProviderRequestError('PROVIDER_QUOTA_EXCEEDED', 'pollinations', {
      message: 'POLLINATIONS_CREDITS_EXHAUSTED: Insufficient Pollen balance',
      cause: { code: 'POLLINATIONS_CREDITS_EXHAUSTED', httpStatus: 402 },
    })
    assert.equal(isV7VideoRetryableError(err), false)
  })

  it('retries PROVIDER_RATE_LIMITED', () => {
    const err = new V7VideoProviderRequestError('PROVIDER_RATE_LIMITED', 'pollinations', {
      message: 'rate limited',
    })
    assert.equal(isV7VideoRetryableError(err), true)
  })

  it('does not retry PROVIDER_AUTH_FAILED', () => {
    const err = new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', 'pollinations', {
      message: 'auth failed',
    })
    assert.equal(isV7VideoRetryableError(err), false)
  })

  it('classifies pollinations credit messages as quota exceeded', () => {
    const err = classifyV7VideoUnknownError(
      'pollinations',
      new Error('POLLINATIONS_CREDITS_EXHAUSTED: Insufficient Pollen balance')
    )
    assert.equal(err.code, 'PROVIDER_QUOTA_EXCEEDED')
    assert.match(err.message, /POLLINATIONS_CREDITS_EXHAUSTED/i)
    assert.equal(isV7VideoRetryableError(err), false)
  })
})
