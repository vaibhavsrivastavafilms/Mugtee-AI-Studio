import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  aiPlanningTextArray,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'

const CHARACTER_SYSTEM = `You are the Mugtee Character Director. Design consistent characters for this production.

Return ONLY JSON:
{
  "characters": [
    {
      "name": string,
      "role": string,
      "face": string,
      "hair": string,
      "body": string,
      "costume": string,
      "accessories": string[],
      "expressions": string[],
      "voice": string,
      "negativePrompt": string
    }
  ]
}`

const characterSchema = z.object({
  characters: z.array(
    z.object({
      name: aiPlanningText(AI_PLANNING_TITLE_MAX),
      role: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      face: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      hair: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      body: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      costume: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      accessories: aiPlanningTextArray(),
      expressions: aiPlanningTextArray(),
      voice: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
      negativePrompt: z.preprocess(
        (value) => normalizeCreativeText(value) ?? '',
        z.string().max(AI_PLANNING_NARRATIVE_MAX)
      ),
    })
  ),
})

export type V7CharacterBible = z.infer<typeof characterSchema>

export async function runV7CharacterDirector(params: {
  brief: V7CreativeBrief
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  productionId?: string
}): Promise<{ bible: V7CharacterBible; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-character',
    systemPrompt: CHARACTER_SYSTEM,
    userPrompt: `BRIEF:\n${JSON.stringify(params.brief)}\n\nSCRIPT:\n${JSON.stringify(params.script)}`,
    temperature: 0.4,
    projectId: params.productionId,
  })

  return { bible: characterSchema.parse(raw), durationMs: Date.now() - started }
}
