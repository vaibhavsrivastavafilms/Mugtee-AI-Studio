import 'server-only'

import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import { buildLocationUserPrompt, LOCATION_SYSTEM_PROMPT } from '@/agents/location/prompt'
import { parseLocationDocument } from '@/agents/location/schema'
import type {
  LocationDocument,
  ProductionPlan,
  ScriptDocument,
  StoryboardDocument,
} from '@/types/v3/production'

export type LocationAgentResult = {
  document: LocationDocument
  raw: Record<string, unknown>
  durationMs: number
}

export async function runLocationAgent(
  plan: ProductionPlan,
  script: ScriptDocument,
  storyboard: StoryboardDocument
): Promise<LocationAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: LOCATION_SYSTEM_PROMPT,
    userPrompt: buildLocationUserPrompt(plan, script, storyboard),
    temperature: 0.4,
    timeoutMs: 120_000,
    agent: 'location',
  })
  const document = parseLocationDocument(raw)
  return {
    document,
    raw,
    durationMs: Date.now() - started,
  }
}
