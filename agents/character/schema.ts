import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_IDENTIFIER_MAX,
  AI_PLANNING_LABEL_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  aiPlanningTextArray,
} from '@/lib/v7/creative-planning-validation'

const characterProfileSchema = z.object({
  characterId: aiPlanningText(AI_PLANNING_IDENTIFIER_MAX),
  name: aiPlanningText(AI_PLANNING_TITLE_MAX),
  age: aiPlanningText(AI_PLANNING_LABEL_MAX),
  appearance: aiPlanningText(AI_PLANNING_NARRATIVE_MAX),
  clothing: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  hairstyle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  accessories: aiPlanningTextArray(),
  facialFeatures: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  seed: aiPlanningText(AI_PLANNING_IDENTIFIER_MAX),
  role: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  sceneNumbers: z.array(z.number().int().min(1)).min(1).max(20),
})

export const characterDocumentSchema = z.object({
  characters: z.array(characterProfileSchema).max(8),
})

export function parseCharacterDocument(raw: Record<string, unknown>) {
  return characterDocumentSchema.parse(raw)
}
