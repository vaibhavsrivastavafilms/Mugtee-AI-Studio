/** V7 text fallback helpers — no server-only deps (unit-testable). */
import type { AIProvider, AITask, ProviderId, ScriptResult } from '@/lib/ai/providers/types'

export function resolveV7AgentTask(agent: string): AITask {
  if (agent === 'v7-script') return 'script'
  if (agent === 'v7-research' || agent === 'v7-idea' || agent === 'v7-concepts') return 'research'
  if (agent === 'v7-storyboard') return 'storyboard'
  return 'script'
}

export class V7StructuredJsonProviderError extends Error {
  constructor(message = 'Structured JSON invalid or empty object') {
    super(message)
    this.name = 'V7StructuredJsonProviderError'
  }
}

export function normalizeV7StructuredObject(parsed: unknown): Record<string, unknown> | null {
  if (Array.isArray(parsed)) {
    if (parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
      return parsed[0] as Record<string, unknown>
    }
    return null
  }
  if (parsed && typeof parsed === 'object') {
    return parsed as Record<string, unknown>
  }
  return null
}

/** Fail a provider attempt when its payload is not a non-empty V7 JSON object. */
export function requireV7StructuredObject(parsed: unknown): Record<string, unknown> {
  const normalized = normalizeV7StructuredObject(parsed)
  if (!normalized || Object.keys(normalized).length === 0) {
    throw new V7StructuredJsonProviderError()
  }
  return normalized
}

export type V7StructuredFallbackInput = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
}

export type V7StructuredFallbackResult = {
  parsed: Record<string, unknown>
  provider: ProviderId
  attemptedProviders: ProviderId[]
}

export type ExecuteWithFallbackFn = <T extends { provider: ProviderId }>(
  task: AITask,
  fn: (provider: AIProvider) => Promise<T>
) => Promise<T & { attemptedProviders: ProviderId[] }>

/**
 * Run the existing multi-provider router for structured V7 JSON.
 * Invalid JSON fails the current provider attempt and lets the router fall through.
 */
export async function runV7StructuredJsonFallback(
  task: AITask,
  input: V7StructuredFallbackInput,
  executeWithFallback: ExecuteWithFallbackFn
): Promise<V7StructuredFallbackResult> {
  const result = await executeWithFallback(task, async (provider) => {
    const scriptResult: ScriptResult = await provider.generateScript({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      topic: input.userPrompt.slice(0, 240),
      temperature: input.temperature,
    })
    const parsed = requireV7StructuredObject(scriptResult.parsed)
    return { parsed, provider: provider.id }
  })

  return {
    parsed: result.parsed,
    provider: result.provider,
    attemptedProviders: result.attemptedProviders,
  }
}

export type V7BoundedFallbackResult = {
  text: string
  provider: ProviderId
  attemptedProviders: ProviderId[]
}

/** Unstructured/bounded text via the same existing router (JSON stringified script payload). */
export async function runV7BoundedTextFallback(
  task: AITask,
  input: V7StructuredFallbackInput,
  executeWithFallback: ExecuteWithFallbackFn
): Promise<V7BoundedFallbackResult> {
  const result = await executeWithFallback(task, async (provider) => {
    const scriptResult = await provider.generateScript({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      topic: input.userPrompt.slice(0, 240),
      temperature: input.temperature,
    })
    return {
      text: JSON.stringify(scriptResult.parsed),
      provider: provider.id,
    }
  })

  return {
    text: result.text,
    provider: result.provider,
    attemptedProviders: result.attemptedProviders,
  }
}
