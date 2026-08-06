import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  aiPlanningText,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'

const STORYBOARD_SYSTEM = `You are the Mugtee Storyboard Engine. For each screenplay scene, define cinematic frames.

Return ONLY JSON:
{
  "scenes": [
    {
      "number": number,
      "shots": [
        {
          "camera": string,
          "lens": string,
          "composition": string,
          "movement": string,
          "lighting": string,
          "dialogue": string,
          "emotion": string,
          "timing": number
        }
      ]
    }
  ]
}`

const storyboardShotFields = {
  camera: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lens: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  composition: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  movement: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  dialogue: z.preprocess(
    (value) => normalizeCreativeText(value) ?? '',
    z.string().max(AI_PLANNING_NARRATIVE_MAX)
  ),
  emotion: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  timing: z.coerce.number().positive(),
}

const storyboardSchema = z.object({
  scenes: z.array(
    z.object({
      number: z.coerce.number().int().min(1),
      shots: z.array(z.object(storyboardShotFields)).min(1),
    })
  ),
})

export type V7StoryboardDocument = z.infer<typeof storyboardSchema>

export async function runV7Storyboard(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  productionId?: string
}): Promise<{ storyboard: V7StoryboardDocument; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-storyboard',
    systemPrompt: STORYBOARD_SYSTEM,
    userPrompt: `BRIEF:\n${JSON.stringify(params.brief)}\n\nCREATIVE:\n${JSON.stringify(params.direction)}\n\nSCRIPT:\n${JSON.stringify(params.script)}`,
    temperature: 0.4,
    projectId: params.productionId,
  })

  return { storyboard: storyboardSchema.parse(raw), durationMs: Date.now() - started }
}
