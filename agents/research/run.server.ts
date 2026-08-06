import 'server-only'

import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import { buildResearchUserPrompt, RESEARCH_SYSTEM_PROMPT } from '@/agents/research/prompt'
import { parseResearchBrief } from '@/agents/research/schema'
import type { ProductionPlan, ResearchBrief } from '@/types/v3/production'

export type ResearchAgentResult = {
  brief: ResearchBrief
  raw: Record<string, unknown>
  durationMs: number
}

export async function runResearchAgent(plan: ProductionPlan): Promise<ResearchAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt: buildResearchUserPrompt(plan),
    temperature: 0.45,
    agent: 'research',
  })
  const brief = parseResearchBrief(raw)
  return {
    brief,
    raw,
    durationMs: Date.now() - started,
  }
}
