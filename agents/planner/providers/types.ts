import 'server-only'

import type { ProductionPlan } from '@/types/v3/production'

export type PlannerInput = {
  userPrompt: string
  projectId?: string
}

export interface PlannerProvider {
  readonly id: 'openai' | 'gemini'
  isConfigured(): boolean
  generate(input: PlannerInput): Promise<ProductionPlan>
}
