import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
} from '@/lib/v7/creative-planning-validation.server'
import { v7LanguageDirectiveForBrief } from '@/lib/v7/language-routing.core'
import type { V7Concept, V7CreativeBrief } from '@/types/v7/production'

const CONCEPT_SYSTEM = `You are the Mugtee Concept Director. Given a creator prompt and production brief, propose exactly FOUR genuinely different film concepts.

Each concept must explore a distinct creative angle — not four rewordings of the same idea.

Return ONLY JSON:
{
  "concepts": [
    {
      "id": "concept-1",
      "title": string,
      "hook": string,
      "coreAngle": string,
      "storyApproach": string,
      "format": string,
      "estimatedDuration": number,
      "tone": string,
      "whyItCouldWork": string
    }
  ]
}

Rules:
- Return exactly 4 concepts with ids concept-1 through concept-4.
- Hooks must be distinct and platform-appropriate.
- estimatedDuration should align with the brief duration when possible.
- Make concepts meaningfully different in emotional register, visual strategy, and narrative structure.`

const conceptSchema = z.object({
  id: z.string().min(1).max(32),
  title: aiPlanningText(AI_PLANNING_TITLE_MAX),
  hook: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  coreAngle: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  storyApproach: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  format: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  estimatedDuration: z.coerce.number().int().min(5).max(600),
  tone: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  whyItCouldWork: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
})

const responseSchema = z.object({
  concepts: z.array(conceptSchema).length(4),
})

export async function runV7ConceptGenerator(params: {
  prompt: string
  brief: V7CreativeBrief
  productionId?: string
}): Promise<{ concepts: V7Concept[]; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-concepts',
    systemPrompt: `${CONCEPT_SYSTEM}\n\n${v7LanguageDirectiveForBrief(params.brief)}`,
    userPrompt: `CREATOR INTENT:\n${params.prompt.trim()}\n\nPRODUCTION BRIEF:\n${JSON.stringify(params.brief, null, 2)}`,
    temperature: 0.65,
    projectId: params.productionId,
  })

  const parsed = responseSchema.parse(raw)
  return { concepts: parsed.concepts, durationMs: Date.now() - started }
}
