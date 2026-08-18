import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveRemotionConcurrencyFrom } from '../render-concurrency.core'

describe('Remotion serverless render concurrency', () => {
  it('forces a single Chrome tab on Vercel regardless of CPU count or env override', () => {
    assert.equal(resolveRemotionConcurrencyFrom({ VERCEL: '1', NODE_ENV: 'production' }, 8), 1)
    assert.equal(
      resolveRemotionConcurrencyFrom(
        { VERCEL: '1', NODE_ENV: 'production', REMOTION_CONCURRENCY: '8' },
        16
      ),
      1
    )
  })

  it('keeps local development at 1', () => {
    assert.equal(resolveRemotionConcurrencyFrom({ NODE_ENV: 'development' }, 8), 1)
  })

  it('caps non-Vercel production at 2 Chrome tabs', () => {
    assert.equal(resolveRemotionConcurrencyFrom({ NODE_ENV: 'production' }, 8), 2)
    assert.equal(resolveRemotionConcurrencyFrom({ NODE_ENV: 'production' }, 2), 1)
  })
})
