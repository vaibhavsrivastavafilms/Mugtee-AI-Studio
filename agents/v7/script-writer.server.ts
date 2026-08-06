import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ResearchBrief } from '@/agents/v7/research.server'

const SCRIPT_SYSTEM = `You are the Mugtee Script Writer and Screenplay Engine.

Write an original, dialogue-driven, family-friendly screenplay optimized for the target platform.

Return ONLY JSON:
{
  "scenes": [
    {
      "number": number,
      "title": string,
      "duration": number,
      "location": string,
      "characters": string[],
      "dialogue": string,
      "action": string,
      "camera": string,
      "lighting": string,
      "movement": string,
      "emotion": string,
      "transition": string,
      "narration": string
    }
  ]
}

Scene count must match the production brief. Include hook in scene 1 and CTA in the final scene when appropriate.`

const scriptSceneFields = {
  number: z.coerce.number().int().min(1),
  title: aiPlanningText(AI_PLANNING_TITLE_MAX),
  duration: z.coerce.number().positive(),
  location: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  characters: z.array(z.string().max(AI_PLANNING_TITLE_MAX)),
  dialogue: z.preprocess(
    (value) => normalizeCreativeText(value) ?? '',
    z.string().max(AI_PLANNING_NARRATIVE_MAX)
  ),
  action: aiPlanningText(AI_PLANNING_NARRATIVE_MAX),
  camera: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  movement: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  emotion: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  transition: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  narration: aiPlanningText(AI_PLANNING_NARRATIVE_MAX),
}

const scriptSchema = z.object({
  scenes: z.array(z.object(scriptSceneFields)).min(1),
})

export type V7ScriptDocument = z.infer<typeof scriptSchema>

export async function runV7ScriptWriter(params: {
  brief: V7CreativeBrief
  research: V7ResearchBrief
  direction: V7CreativeDirection
  productionId?: string
}): Promise<{ script: V7ScriptDocument; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-script',
    systemPrompt: SCRIPT_SYSTEM,
    userPrompt: `BRIEF:\n${JSON.stringify(params.brief)}\n\nRESEARCH:\n${JSON.stringify(params.research)}\n\nCREATIVE:\n${JSON.stringify(params.direction)}`,
    temperature: 0.5,
    projectId: params.productionId,
  })

  return { script: scriptSchema.parse(raw), durationMs: Date.now() - started }
}
