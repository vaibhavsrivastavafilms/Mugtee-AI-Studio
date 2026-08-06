import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  aiPlanningTextArray,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'

const WORLD_SYSTEM = `You are the Mugtee World Builder. Design environments for this production.

Return ONLY JSON:
{
  "locations": [
    {
      "name": string,
      "architecture": string,
      "props": string[],
      "lighting": string,
      "weather": string,
      "textures": string[],
      "objects": string[],
      "colorPalette": string[],
      "timeOfDay": string
    }
  ]
}`

const worldSchema = z.object({
  locations: z.array(
    z.object({
      name: aiPlanningText(AI_PLANNING_TITLE_MAX),
      architecture: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      props: aiPlanningTextArray(),
      lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      weather: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      textures: aiPlanningTextArray(),
      objects: aiPlanningTextArray(),
      colorPalette: aiPlanningTextArray(),
      timeOfDay: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
    })
  ),
})

export type V7WorldBible = z.infer<typeof worldSchema>

export async function runV7WorldBuilder(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  productionId?: string
}): Promise<{ world: V7WorldBible; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-world',
    systemPrompt: WORLD_SYSTEM,
    userPrompt: `BRIEF:\n${JSON.stringify(params.brief)}\n\nCREATIVE:\n${JSON.stringify(params.direction)}\n\nSCRIPT:\n${JSON.stringify(params.script)}`,
    temperature: 0.4,
    projectId: params.productionId,
  })

  return { world: worldSchema.parse(raw), durationMs: Date.now() - started }
}
