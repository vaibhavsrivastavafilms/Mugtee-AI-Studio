import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getProviderAttemptOrder,
  hasProviderKey,
} from '@/lib/ai/providers/task-routing'

test('hasProviderKey detects pollinations when POLLINATIONS_API_KEY is configured', () => {
  const original = process.env.POLLINATIONS_API_KEY
  process.env.POLLINATIONS_API_KEY = 'pk_test_pollinations_primary'
  try {
    assert.equal(hasProviderKey('pollinations'), true)
  } finally {
    if (original === undefined) delete process.env.POLLINATIONS_API_KEY
    else process.env.POLLINATIONS_API_KEY = original
  }
})

test('getProviderAttemptOrder prefers pollinations for research and script tasks', () => {
  const originalPollinations = process.env.POLLINATIONS_API_KEY
  const originalGroq = process.env.GROQ_API_KEY
  process.env.POLLINATIONS_API_KEY = 'pk_test_pollinations_primary'
  process.env.GROQ_API_KEY = 'gsk_test_groq_fallback'

  try {
    assert.equal(getProviderAttemptOrder('research')[0], 'pollinations')
    assert.equal(getProviderAttemptOrder('script')[0], 'pollinations')
    assert.equal(getProviderAttemptOrder('storyboard')[0], 'pollinations')
  } finally {
    if (originalPollinations === undefined) delete process.env.POLLINATIONS_API_KEY
    else process.env.POLLINATIONS_API_KEY = originalPollinations
    if (originalGroq === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalGroq
  }
})
