import { z } from 'zod'

import { AI_PLANNING_DIRECTION_MAX, aiPlanningText } from '@/lib/v7/creative-planning-validation'

export const cinematicStyleSchema = z.object({
  cameraSystem: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lens: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  lightingStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  colorGrading: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  motionStyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  filmStock: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  composition: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
})

export function parseCinematicStyle(raw: Record<string, unknown>) {
  return cinematicStyleSchema.parse(raw)
}
