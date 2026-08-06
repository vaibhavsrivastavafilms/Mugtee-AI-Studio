import 'server-only'

import type { PlannerInput } from '@/agents/planner/providers/types'
import { buildDeterministicProductionPlan } from '@/agents/planner/providers/deterministic.core'
import type { ProductionPlan } from '@/types/v3/production'

export { buildDeterministicProductionPlan } from '@/agents/planner/providers/deterministic.core'

export async function generateDeterministicPlan(input: PlannerInput): Promise<ProductionPlan> {
  return buildDeterministicProductionPlan(input.userPrompt)
}
