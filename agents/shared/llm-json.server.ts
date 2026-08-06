import 'server-only'

import { ZodError } from 'zod'
import { AllProvidersFailedError, ProviderRequestError } from '@/agents/shared/provider-errors'
import { runWithProviderFallback } from '@/agents/shared/provider-fallback.server'
import { geminiTextProvider } from '@/agents/shared/text-providers/gemini.server'
import { openaiTextProvider } from '@/agents/shared/text-providers/openai.server'
import type { StructuredJsonRequest } from '@/agents/shared/text-llm.types'

const TEXT_PROVIDERS = [openaiTextProvider, geminiTextProvider]

export async function generateStructuredJson<T extends Record<string, unknown>>(
  params: StructuredJsonRequest & { agent?: string }
): Promise<T> {
  const agent = params.agent ?? 'v3_text'

  try {
    return await runWithProviderFallback({
      agent,
      envVar: params.agent === 'script' ? 'SCRIPT_PROVIDER' : 'V3_TEXT_PROVIDER',
      projectId: params.projectId,
      providers: TEXT_PROVIDERS,
      run: async (provider) => {
        try {
          return await provider.generateStructuredJson<T>(params)
        } catch (err) {
          if (err instanceof ZodError) {
            throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider.id, {
              message: 'Structured JSON schema validation failed',
              cause: err,
            })
          }
          throw err
        }
      },
    })
  } catch (err) {
    if (err instanceof AllProvidersFailedError) throw err
    throw err
  }
}
