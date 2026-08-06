import 'server-only'

import { generateProductionPlan } from '@/agents/planner/providers/registry.server'
import type { ProductionPlan } from '@/types/v3/production'

export type PlannerAgentResult = {
  plan: ProductionPlan
  raw: Record<string, unknown>
  durationMs: number
}

export async function runPlannerAgent(
  userPrompt: string,
  options?: { projectId?: string }
): Promise<PlannerAgentResult> {
  const started = Date.now()
  const plan = await generateProductionPlan({
    userPrompt,
    projectId: options?.projectId,
  })
  return {
    plan,
    raw: plan as unknown as Record<string, unknown>,
    durationMs: Date.now() - started,
  }
}
