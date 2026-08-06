import 'server-only'



import { runV7TextProviderChain, validateV7TextProvidersOnStartup } from '@/lib/v7/providers/registry.server'

import { V7ProviderRequestError } from '@/lib/v7/providers/text-errors.server'

import { parseLlmJsonText } from '@/lib/ai/providers/shared'

import type { V7TextRequest } from '@/lib/v7/providers/types'



export { validateV7TextProvidersOnStartup }



export async function generateV7StructuredJson(

  input: V7TextRequest & { agent: string }

): Promise<Record<string, unknown>> {

  const result = await runV7TextProviderChain({

    agent: input.agent,

    systemPrompt: input.systemPrompt,

    userPrompt: input.userPrompt,

    temperature: input.temperature,

    projectId: input.projectId,

  })



  const parsed = parseLlmJsonText(result.output)

  if (!parsed || Object.keys(parsed).length === 0) {

    throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'openrouter-qwen', {

      message: 'Structured JSON normalization failed',

    })

  }

  return parsed

}


