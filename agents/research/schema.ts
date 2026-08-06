import { z } from 'zod'

import {
  AI_PLANNING_LIST_ITEM_MAX,
  aiPlanningTextArray,
} from '@/lib/v7/creative-planning-validation'

const researchItem = z.string().min(1).max(AI_PLANNING_LIST_ITEM_MAX)

export const researchBriefSchema = z.object({
  topics: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
  culturalNotes: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  visualReferences: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  storytellingReferences: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  emotionalDirection: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
  keyFacts: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
})

export function parseResearchBrief(raw: Record<string, unknown>) {
  return researchBriefSchema.parse(raw)
}
