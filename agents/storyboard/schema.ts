import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  aiPlanningText,
} from '@/lib/v7/creative-planning-validation'

const storyboardShotSchema = z.object({
  cameraAngle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  framing: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  movement: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lens: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  location: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  duration: z.number().min(0.5).max(30),
})

const storyboardSceneSchema = z.object({
  number: z.number().int().min(1),
  shots: z.array(storyboardShotSchema).min(1).max(6),
})

export const storyboardDocumentSchema = z.object({
  scenes: z.array(storyboardSceneSchema).min(1).max(20),
})

export function parseStoryboardDocument(raw: Record<string, unknown>) {
  return storyboardDocumentSchema.parse(raw)
}
