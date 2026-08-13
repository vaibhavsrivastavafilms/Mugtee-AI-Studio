import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  inspectPollinationsKeyConfig,
  normalizePollinationsEnvKey,
  readPollinationsApiKeyFromEnv,
} from '@/lib/pollinations/key-diagnostics-core'

describe('Pollinations key diagnostics', () => {
  it('rejects placeholder keys', () => {
    const original = process.env.POLLINATIONS_API_KEY
    process.env.POLLINATIONS_API_KEY = 'your_key_from_pollinations.ai'
    try {
      assert.equal(readPollinationsApiKeyFromEnv(), undefined)
      const config = inspectPollinationsKeyConfig()
      assert.equal(config.rejectedAsPlaceholder, true)
      assert.equal(config.validFormat, false)
    } finally {
      if (original == null) delete process.env.POLLINATIONS_API_KEY
      else process.env.POLLINATIONS_API_KEY = original
    }
  })

  it('strips surrounding quotes from env values', () => {
    assert.equal(normalizePollinationsEnvKey('"sk_test123"'), 'sk_test123')
    assert.equal(normalizePollinationsEnvKey("'sk_test123'"), 'sk_test123')
  })
})
