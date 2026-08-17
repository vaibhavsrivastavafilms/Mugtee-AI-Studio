import 'server-only'

import { resolveActiveTextProvider } from '@/lib/ai/config'
import { executeWithFallback } from '@/lib/ai/providers/router'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import { getAvailableProviders } from '@/lib/ai/providers/task-routing'
import type { ProviderId } from '@/lib/ai/providers/types'
import {
  normalizeV7StructuredObject,
  resolveV7AgentTask,
  runV7BoundedTextFallback,
  runV7StructuredJsonFallback,
} from '@/lib/v7/providers/text-fallback.core'
import {
  classifyV7UnknownError,
  V7ProviderRequestError,
} from '@/lib/v7/providers/text-errors.server'
import type { V7TextRequest } from '@/lib/v7/providers/types'

export { validateTextProviderOnStartup as validateV7TextProvidersOnStartup } from '@/lib/ai/config'
export { resolveV7AgentTask } from '@/lib/v7/providers/text-fallback.core'

/** Hard wall for one V7 text call chain — fits inside a single cron stage window. */
export const V7_TEXT_GENERATION_WALL_MS = 120_000

export type V7TextGenerateResult = {
  text: string
  provider: ProviderId
  model: string
  latencyMs: number
  retryCount: number
  attemptedProviders: ProviderId[]
}

export function createV7TextGenerationDeadline(): number {
  return Date.now() + V7_TEXT_GENERATION_WALL_MS
}

export function remainingV7TextBudgetMs(deadlineMs: number): number {
  return Math.max(0, deadlineMs - Date.now())
}

export function assertV7TextBudgetRemaining(
  deadlineMs: number,
  provider: ReturnType<typeof resolveActiveTextProvider>
): void {
  if (remainingV7TextBudgetMs(deadlineMs) <= 0) {
    throw new V7ProviderRequestError('PROVIDER_TIMEOUT', provider, {
      message: `V7 text generation exceeded ${V7_TEXT_GENERATION_WALL_MS / 1000}s wall budget`,
    })
  }
}

function resolveProviderModelLabel(providerId: ProviderId): string {
  switch (providerId) {
    case 'pollinations':
      return process.env.POLLINATIONS_TEXT_MODEL?.trim() || 'pollinations'
    case 'gemini':
      return process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini'
    case 'groq':
      return process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'
    case 'openrouter':
      return (
        process.env.OPENROUTER_SCRIPT_MODEL?.trim() ||
        process.env.OPENROUTER_MODEL?.trim() ||
        'openrouter'
      )
    case 'openai':
      return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
    case 'deepseek':
      return process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
    default:
      return providerId
  }
}

function assertTextProvidersConfigured(
  legacyProvider: ReturnType<typeof resolveActiveTextProvider>
): void {
  if (getAvailableProviders().length === 0) {
    throw new V7ProviderRequestError('PROVIDER_AUTH_FAILED', legacyProvider, {
      message: 'No text provider API keys configured',
    })
  }
}

export async function generateV7BoundedText(
  input: V7TextRequest & { agent: string; deadlineMs: number }
): Promise<V7TextGenerateResult> {
  const legacyProvider = resolveActiveTextProvider()
  assertV7TextBudgetRemaining(input.deadlineMs, legacyProvider)
  assertTextProvidersConfigured(legacyProvider)

  const task = resolveV7AgentTask(input.agent)
  const started = Date.now()

  try {
    const result = await runV7BoundedTextFallback(
      task,
      {
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        temperature: input.temperature,
      },
      executeWithFallback
    )

    console.info('[v7-text] provider fallback succeeded', {
      agent: input.agent,
      task,
      provider: result.provider,
      attemptedProviders: result.attemptedProviders,
      projectId: input.projectId ?? null,
    })

    return {
      text: result.text,
      provider: result.provider,
      model: resolveProviderModelLabel(result.provider),
      latencyMs: Date.now() - started,
      retryCount: Math.max(0, result.attemptedProviders.length - 1),
      attemptedProviders: result.attemptedProviders,
    }
  } catch (err) {
    throw classifyV7UnknownError(legacyProvider, err)
  }
}

export async function generateV7StructuredJson(
  input: V7TextRequest & { agent: string; deadlineMs?: number }
): Promise<Record<string, unknown>> {
  const legacyProvider = resolveActiveTextProvider()
  const deadlineMs = input.deadlineMs ?? createV7TextGenerationDeadline()
  assertV7TextBudgetRemaining(deadlineMs, legacyProvider)
  assertTextProvidersConfigured(legacyProvider)

  const task = resolveV7AgentTask(input.agent)

  try {
    const result = await runV7StructuredJsonFallback(
      task,
      {
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        temperature: input.temperature,
      },
      executeWithFallback
    )

    console.info('[v7-text] structured JSON fallback succeeded', {
      agent: input.agent,
      task,
      provider: result.provider,
      attemptedProviders: result.attemptedProviders,
      projectId: input.projectId ?? null,
    })

    // Final guard — schema validation happens in each V7 agent (zod).
    const normalized = normalizeV7StructuredObject(result.parsed)
    if (!normalized || Object.keys(normalized).length === 0) {
      throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', legacyProvider, {
        message: 'Structured JSON validation failed after provider fallback',
      })
    }

    return normalized
  } catch (err) {
    throw classifyV7UnknownError(legacyProvider, err)
  }
}
