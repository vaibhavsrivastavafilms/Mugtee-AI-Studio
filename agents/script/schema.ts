import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation'

const scriptSceneSchema = z.object({
  number: z.number().int().min(1),
  title: aiPlanningText(AI_PLANNING_TITLE_MAX),
  narration: aiPlanningText(AI_PLANNING_NARRATIVE_MAX),
  dialogue: z.preprocess(
    (value) => normalizeCreativeText(value) ?? '',
    z.string().max(AI_PLANNING_NARRATIVE_MAX)
  ),
  duration: z.number().min(1).max(60),
  emotion: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  transition: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
})

export const scriptDocumentSchema = z.object({
  scenes: z.array(scriptSceneSchema).min(1).max(20),
})

export function parseScriptDocument(raw: Record<string, unknown>) {
  return scriptDocumentSchema.parse(raw)
}
