import assert from 'node:assert/strict'
import test from 'node:test'

import { AIProviderError } from '@/lib/ai/providers/types'
import type { AIProvider, ProviderId, ScriptResult } from '@/lib/ai/providers/types'
import {
  normalizeV7StructuredObject,
  requireV7StructuredObject,
  resolveV7AgentTask,
  runV7BoundedTextFallback,
  runV7StructuredJsonFallback,
  V7StructuredJsonProviderError,
  type ExecuteWithFallbackFn,
} from '@/lib/v7/providers/text-fallback.core'

function mockProvider(id: ProviderId, parsed: Record<string, unknown> | 'invalid' | 'throw'): AIProvider {
  return {
    id,
    isAvailable: () => true,
    generateHook: async () => ({ hook: 'h', provider: id }),
    generateTitle: async () => ({ title: 't', provider: id }),
    generateCaption: async () => ({ captions: {}, provider: id }),
    generateScript: async () => {
      if (parsed === 'throw') {
        throw new Error(`OpenRouter HTTP 402: insufficient credits`)
      }
      if (parsed === 'invalid') {
        return { parsed: {}, provider: id } satisfies ScriptResult
      }
      return { parsed, provider: id } satisfies ScriptResult
    },
  }
}

function createMockExecuteWithFallback(
  providers: AIProvider[]
): ExecuteWithFallbackFn {
  return async (task, fn) => {
    const attemptedProviders: ProviderId[] = []
    const errors: string[] = []

    for (const provider of providers) {
      attemptedProviders.push(provider.id)
      try {
        const result = await fn(provider)
        return { ...result, attemptedProviders }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    throw new AIProviderError(
      errors.join('; ') || 'All providers failed',
      'Generation paused — try again.',
      undefined,
      task
    )
  }
}

test('resolveV7AgentTask maps V7 agents to existing task-routing chains', () => {
  assert.equal(resolveV7AgentTask('v7-idea'), 'research')
  assert.equal(resolveV7AgentTask('v7-concepts'), 'research')
  assert.equal(resolveV7AgentTask('v7-research'), 'research')
  assert.equal(resolveV7AgentTask('v7-script'), 'script')
  assert.equal(resolveV7AgentTask('v7-storyboard'), 'storyboard')
  assert.equal(resolveV7AgentTask('v7-creative'), 'script')
})

test('requireV7StructuredObject rejects empty payloads', () => {
  assert.throws(() => requireV7StructuredObject({}), V7StructuredJsonProviderError)
  assert.throws(() => requireV7StructuredObject('not json'), V7StructuredJsonProviderError)
})

test('normalizeV7StructuredObject unwraps single-element arrays', () => {
  assert.deepEqual(normalizeV7StructuredObject([{ title: 'x' }]), { title: 'x' })
})

test('runV7StructuredJsonFallback returns first successful provider payload', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('openrouter', { title: 'Ancient Mysteries' }),
  ])

  const result = await runV7StructuredJsonFallback(
    'research',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'openrouter')
  assert.equal(result.parsed.title, 'Ancient Mysteries')
  assert.deepEqual(result.attemptedProviders, ['openrouter'])
})

test('runV7StructuredJsonFallback falls back when OpenRouter fails with quota error', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('openrouter', 'throw'),
    mockProvider('gemini', { title: 'Fallback Brief', duration: 60 }),
  ])

  const result = await runV7StructuredJsonFallback(
    'research',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'gemini')
  assert.equal(result.parsed.title, 'Fallback Brief')
  assert.deepEqual(result.attemptedProviders, ['openrouter', 'gemini'])
})

test('runV7StructuredJsonFallback skips invalid JSON and tries next provider', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('openrouter', 'invalid'),
    mockProvider('groq', { title: 'Valid Groq', sceneCount: 5 }),
  ])

  const result = await runV7StructuredJsonFallback(
    'research',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'groq')
  assert.equal(result.parsed.sceneCount, 5)
  assert.deepEqual(result.attemptedProviders, ['openrouter', 'groq'])
})

test('runV7StructuredJsonFallback throws when all providers fail', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('openrouter', 'throw'),
    mockProvider('gemini', 'throw'),
  ])

  await assert.rejects(
    () =>
      runV7StructuredJsonFallback(
        'research',
        { systemPrompt: 'sys', userPrompt: 'user' },
        executeWithFallback
      ),
    AIProviderError
  )
})

test('runV7StructuredJsonFallback prefers pollinations then falls back on failure', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('pollinations', 'throw'),
    mockProvider('groq', { title: 'Pollinations Fallback', duration: 60 }),
  ])

  const result = await runV7StructuredJsonFallback(
    'research',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'groq')
  assert.deepEqual(result.attemptedProviders, ['pollinations', 'groq'])
})

test('runV7BoundedTextFallback prefers pollinations then falls back on failure', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('pollinations', 'throw'),
    mockProvider('groq', { scenes: [{ number: 1 }] }),
  ])

  const result = await runV7BoundedTextFallback(
    'script',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'groq')
  assert.deepEqual(result.attemptedProviders, ['pollinations', 'groq'])
  assert.deepEqual(JSON.parse(result.text), { scenes: [{ number: 1 }] })
})

test('runV7BoundedTextFallback returns JSON text from fallback provider', async () => {
  const executeWithFallback = createMockExecuteWithFallback([
    mockProvider('openrouter', 'throw'),
    mockProvider('groq', { scenes: [{ number: 1 }] }),
  ])

  const result = await runV7BoundedTextFallback(
    'script',
    { systemPrompt: 'sys', userPrompt: 'user' },
    executeWithFallback
  )

  assert.equal(result.provider, 'groq')
  assert.deepEqual(JSON.parse(result.text), { scenes: [{ number: 1 }] })
})
