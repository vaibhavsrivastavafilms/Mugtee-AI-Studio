import 'server-only'

import { resolveActiveTextProvider } from '@/lib/ai/config'
import { generateText } from '@/lib/ai/provider'
import { openRouterModelRouter } from '@/lib/ai/providers/openrouter/router'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import { V7ProviderRequestError } from '@/lib/v7/providers/text-errors.server'
import type { V7TextRequest } from '@/lib/v7/providers/types'

export { validateTextProviderOnStartup as validateV7TextProvidersOnStartup } from '@/lib/ai/config'

const MAX_STRUCTURED_ATTEMPTS = 3

function normalizeStructuredObject(parsed: unknown): Record<string, unknown> | null {
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

export async function generateV7StructuredJson(
  input: V7TextRequest & { agent: string }
): Promise<Record<string, unknown>> {
  const provider = resolveActiveTextProvider()
  let lastModel: string | null = null
  let retriedSameModel = false

  for (let attempt = 0; attempt < MAX_STRUCTURED_ATTEMPTS; attempt++) {
    const result = await generateText({
      agent: input.agent,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      temperature: input.temperature,
      projectId: input.projectId,
    })

    lastModel = result.model
    const parsed = normalizeStructuredObject(parseLlmJsonText(result.text))

    if (parsed && Object.keys(parsed).length > 0) {
      return parsed
    }

    console.warn('[v7-text] structured JSON invalid', {
      agent: input.agent,
      attempt,
      model: result.model,
      projectId: input.projectId ?? null,
      retriedSameModel,
    })

    if (result.model && retriedSameModel) {
      openRouterModelRouter.blacklistModel(result.model, 'invalid_json')
      retriedSameModel = false
    } else {
      retriedSameModel = true
    }

    if (attempt >= MAX_STRUCTURED_ATTEMPTS - 1) break
  }

  throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
    message: `Structured JSON validation failed after ${MAX_STRUCTURED_ATTEMPTS} attempts`,
  })
}
