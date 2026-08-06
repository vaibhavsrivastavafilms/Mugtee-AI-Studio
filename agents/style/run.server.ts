import 'server-only'

import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import { buildStyleUserPrompt, STYLE_SYSTEM_PROMPT } from '@/agents/style/prompt'
import { parseCinematicStyle } from '@/agents/style/schema'
import type { CinematicStyle, ProductionPlan, ResearchBrief } from '@/types/v3/production'

export type StyleAgentResult = {
  style: CinematicStyle
  raw: Record<string, unknown>
  durationMs: number
}

export async function runStyleAgent(
  plan: ProductionPlan,
  research: ResearchBrief
): Promise<StyleAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: STYLE_SYSTEM_PROMPT,
    userPrompt: buildStyleUserPrompt(plan, research),
    temperature: 0.35,
    timeoutMs: 90_000,
    agent: 'style',
  })
  const style = parseCinematicStyle(raw)
  return {
    style,
    raw,
    durationMs: Date.now() - started,
  }
}
