import 'server-only'

import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import { buildStoryboardUserPrompt, STORYBOARD_SYSTEM_PROMPT } from '@/agents/storyboard/prompt'
import { parseStoryboardDocument } from '@/agents/storyboard/schema'
import type { ProductionPlan, ScriptDocument, StoryboardDocument } from '@/types/v3/production'

export type StoryboardAgentResult = {
  storyboard: StoryboardDocument
  raw: Record<string, unknown>
  durationMs: number
}

export async function runStoryboardAgent(
  plan: ProductionPlan,
  script: ScriptDocument
): Promise<StoryboardAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: STORYBOARD_SYSTEM_PROMPT,
    userPrompt: buildStoryboardUserPrompt(plan, script),
    temperature: 0.45,
    timeoutMs: 120_000,
    agent: 'storyboard',
  })
  const storyboard = parseStoryboardDocument(raw)
  return {
    storyboard,
    raw,
    durationMs: Date.now() - started,
  }
}
