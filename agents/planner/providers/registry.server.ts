import 'server-only'

import { ZodError } from 'zod'
import { geminiPlannerProvider } from '@/agents/planner/providers/gemini.server'
import { openaiPlannerProvider } from '@/agents/planner/providers/openai.server'
import { generateDeterministicPlan } from '@/agents/planner/providers/deterministic.server'
import type { PlannerInput, PlannerProvider } from '@/agents/planner/providers/types'
import {
  AllProvidersFailedError,
  ProviderRequestError,
} from '@/agents/shared/provider-errors'
import { isPlannerDeterministicFallbackEnabled } from '@/agents/shared/provider-order'
import { runWithProviderFallback } from '@/agents/shared/provider-fallback.server'
import type { ProductionPlan } from '@/types/v3/production'

const PLANNER_PROVIDERS: PlannerProvider[] = [openaiPlannerProvider, geminiPlannerProvider]

export async function generateProductionPlan(input: PlannerInput): Promise<ProductionPlan> {
  if (isPlannerDeterministicFallbackEnabled()) {
    return generateDeterministicPlan(input)
  }

  try {
    return await runWithProviderFallback({
      agent: 'planner',
      envVar: 'PLANNER_PROVIDER',
      providers: PLANNER_PROVIDERS,
      projectId: input.projectId,
      run: async (provider) => {
        try {
          return await provider.generate(input)
        } catch (err) {
          if (err instanceof ZodError) {
            throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider.id, {
              message: 'Planner schema validation failed',
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
