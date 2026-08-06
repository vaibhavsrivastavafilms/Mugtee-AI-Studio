import 'server-only'

import { buildPlannerUserPrompt, PLANNER_SYSTEM_PROMPT } from '@/agents/planner/prompt'
import { parseProductionPlan } from '@/agents/planner/schema'
import type { PlannerInput, PlannerProvider } from '@/agents/planner/providers/types'
import { geminiTextProvider } from '@/agents/shared/text-providers/gemini.server'

export const geminiPlannerProvider: PlannerProvider = {
  id: 'gemini',
  isConfigured: () => geminiTextProvider.isConfigured(),
  async generate(input: PlannerInput) {
    const raw = await geminiTextProvider.generateStructuredJson<Record<string, unknown>>({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt: buildPlannerUserPrompt(input.userPrompt),
      temperature: 0.35,
      agent: 'planner',
      projectId: input.projectId,
    })
    return parseProductionPlan(raw, input.userPrompt)
  },
}
