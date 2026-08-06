import 'server-only'

import { buildPlannerUserPrompt, PLANNER_SYSTEM_PROMPT } from '@/agents/planner/prompt'
import { parseProductionPlan } from '@/agents/planner/schema'
import type { PlannerInput, PlannerProvider } from '@/agents/planner/providers/types'
import { openaiTextProvider } from '@/agents/shared/text-providers/openai.server'

export const openaiPlannerProvider: PlannerProvider = {
  id: 'openai',
  isConfigured: () => openaiTextProvider.isConfigured(),
  async generate(input: PlannerInput) {
    const raw = await openaiTextProvider.generateStructuredJson<Record<string, unknown>>({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt: buildPlannerUserPrompt(input.userPrompt),
      temperature: 0.35,
      agent: 'planner',
      projectId: input.projectId,
    })
    return parseProductionPlan(raw, input.userPrompt)
  },
}
