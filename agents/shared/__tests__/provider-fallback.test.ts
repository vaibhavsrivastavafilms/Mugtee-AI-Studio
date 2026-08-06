import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  AllProvidersFailedError,
  classifyHttpProviderError,
  isRetryableProviderError,
} from '@/agents/shared/provider-errors'
import {
  parseProviderMode,
  resolveTextProviderOrder,
  type ProviderLike,
} from '@/agents/shared/provider-order'
import { buildDeterministicProductionPlan } from '@/agents/planner/providers/deterministic.core'

function mockProvider(id: 'openai' | 'gemini', configured = true): ProviderLike {
  return {
    id,
    isConfigured: () => configured,
  }
}

describe('provider error classification', () => {
  it('classifies Gemini quota 429', () => {
    const err = classifyHttpProviderError(
      'gemini',
      429,
      'You exceeded your current quota, please check your plan and billing details.'
    )
    assert.equal(err.code, 'PROVIDER_QUOTA_EXCEEDED')
    assert.equal(isRetryableProviderError(err), true)
  })

  it('classifies auth failures as non-retryable', () => {
    const err = classifyHttpProviderError('openai', 401, 'invalid key')
    assert.equal(err.code, 'PROVIDER_AUTH_FAILED')
    assert.equal(isRetryableProviderError(err), false)
  })

  it('classifies 503 as retryable unavailable', () => {
    const err = classifyHttpProviderError('openai', 503, 'upstream unavailable')
    assert.equal(err.code, 'PROVIDER_UNAVAILABLE')
    assert.equal(isRetryableProviderError(err), true)
  })
})

describe('provider order resolution', () => {
  it('auto prefers OpenAI when both configured', () => {
    const prevOpenAi = process.env.OPENAI_API_KEY
    const prevGemini = process.env.GEMINI_API_KEY
    const prevMode = process.env.PLANNER_PROVIDER
    process.env.OPENAI_API_KEY = 'test-openai'
    process.env.GEMINI_API_KEY = 'test-gemini'
    process.env.PLANNER_PROVIDER = 'auto'

    const order = resolveTextProviderOrder('PLANNER_PROVIDER', [
      mockProvider('openai'),
      mockProvider('gemini'),
    ])
    assert.deepEqual(
      order.map((p) => p.id),
      ['openai', 'gemini']
    )

    process.env.OPENAI_API_KEY = prevOpenAi
    process.env.GEMINI_API_KEY = prevGemini
    process.env.PLANNER_PROVIDER = prevMode
  })

  it('gemini mode falls back to openai when configured', () => {
    process.env.PLANNER_PROVIDER = 'gemini'
    const order = resolveTextProviderOrder('PLANNER_PROVIDER', [
      mockProvider('openai'),
      mockProvider('gemini'),
    ])
    assert.deepEqual(
      order.map((p) => p.id),
      ['gemini', 'openai']
    )
  })

  it('auto uses Gemini when OpenAI missing', () => {
    const order = resolveTextProviderOrder('PLANNER_PROVIDER', [
      mockProvider('openai', false),
      mockProvider('gemini'),
    ])
    assert.deepEqual(
      order.map((p) => p.id),
      ['gemini']
    )
  })

  it('parses provider modes', () => {
    const prev = process.env.PLANNER_PROVIDER
    process.env.PLANNER_PROVIDER = 'openai'
    assert.equal(parseProviderMode('PLANNER_PROVIDER'), 'openai')
    process.env.PLANNER_PROVIDER = 'auto'
    assert.equal(parseProviderMode('PLANNER_PROVIDER'), 'auto')
    process.env.PLANNER_PROVIDER = prev
  })
})

describe('all providers failed', () => {
  it('aggregates provider failures', () => {
    const err = new AllProvidersFailedError([
      { provider: 'gemini', code: 'PROVIDER_QUOTA_EXCEEDED' },
      { provider: 'openai', code: 'PROVIDER_UNAVAILABLE' },
    ])
    assert.equal(err.code, 'ALL_PROVIDERS_FAILED')
    assert.equal(err.failures.length, 2)
  })
})

describe('deterministic planner fallback shape', () => {
  it('builds a valid minimal plan', () => {
    const plan = buildDeterministicProductionPlan(
      'create a 45 sec monsoon restaurant video in Ahmedabad'
    )
    assert.equal(plan.duration, 45)
    assert.ok(plan.title.length > 0)
    assert.ok(plan.sceneCount >= 1)
    assert.ok(plan.sceneCount <= 20)
  })
})
