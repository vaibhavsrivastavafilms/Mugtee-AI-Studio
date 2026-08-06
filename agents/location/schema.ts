import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_IDENTIFIER_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
} from '@/lib/v7/creative-planning-validation'

const locationProfileSchema = z.object({
  locationId: aiPlanningText(AI_PLANNING_IDENTIFIER_MAX),
  name: aiPlanningText(AI_PLANNING_TITLE_MAX),
  lighting: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  mood: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  architecture: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  weather: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  environment: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  cameraRestrictions: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  sceneNumbers: z.array(z.number().int().min(1)).min(1).max(20),
})

export const locationDocumentSchema = z.object({
  locations: z.array(locationProfileSchema).min(1).max(12),
})

export function parseLocationDocument(raw: Record<string, unknown>) {
  return locationDocumentSchema.parse(raw)
}
