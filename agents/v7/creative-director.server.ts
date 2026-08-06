import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_LIST_ITEM_MAX,
  aiPlanningText,
  aiPlanningTextArray,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7ResearchBrief } from '@/agents/v7/research.server'

const CREATIVE_SYSTEM = `You are the Mugtee Creative Director. Decide the cinematic vision for this production.

Return ONLY JSON:
{
  "visualStyle": string,
  "animationStyle": string,
  "cameraLanguage": string,
  "colorPalette": string[],
  "lighting": string,
  "editingStyle": string,
  "typography": string,
  "musicStyle": string,
  "voiceStyle": string,
  "moodBoard": string[]
}`

const creativeSchema = z.object({
  visualStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  animationStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  cameraLanguage: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  colorPalette: aiPlanningTextArray(AI_PLANNING_LIST_ITEM_MAX).pipe(
    z.array(z.string().min(1).max(AI_PLANNING_LIST_ITEM_MAX)).min(1)
  ),
  lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  editingStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  typography: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  musicStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  voiceStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  moodBoard: aiPlanningTextArray(AI_PLANNING_LIST_ITEM_MAX).pipe(
    z.array(z.string().min(1).max(AI_PLANNING_LIST_ITEM_MAX)).min(1)
  ),
})

export type V7CreativeDirection = z.infer<typeof creativeSchema>

export async function runV7CreativeDirector(params: {
  brief: V7CreativeBrief
  research: V7ResearchBrief
  productionId?: string
}): Promise<{ direction: V7CreativeDirection; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-creative',
    systemPrompt: CREATIVE_SYSTEM,
    userPrompt: `BRIEF:\n${JSON.stringify(params.brief)}\n\nRESEARCH:\n${JSON.stringify(params.research)}`,
    temperature: 0.45,
    projectId: params.productionId,
  })

  return { direction: creativeSchema.parse(raw), durationMs: Date.now() - started }
}
