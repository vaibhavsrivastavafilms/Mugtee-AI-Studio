import 'server-only'

import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import { buildScriptUserPrompt, SCRIPT_SYSTEM_PROMPT } from '@/agents/script/prompt'
import { parseScriptDocument } from '@/agents/script/schema'
import type { ProductionPlan, ResearchBrief, ScriptDocument } from '@/types/v3/production'

export type ScriptAgentResult = {
  script: ScriptDocument
  raw: Record<string, unknown>
  durationMs: number
}

export async function runScriptAgent(
  plan: ProductionPlan,
  research: ResearchBrief
): Promise<ScriptAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: SCRIPT_SYSTEM_PROMPT,
    userPrompt: buildScriptUserPrompt(plan, research),
    temperature: 0.55,
    timeoutMs: 120_000,
    agent: 'script',
  })
  const script = parseScriptDocument(raw)
  return {
    script,
    raw,
    durationMs: Date.now() - started,
  }
}
