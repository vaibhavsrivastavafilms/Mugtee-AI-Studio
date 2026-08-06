import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  AI_PLANNING_LIST_ITEM_MAX,
  aiPlanningTextArray,
} from '@/lib/v7/creative-planning-validation.server'
import type { V7CreativeBrief } from '@/types/v7/production'

const RESEARCH_SYSTEM = `You are the Mugtee Deep Research Engine. Build a factual, creative research brief for a film production.

Return ONLY JSON:
{
  "topics": string[],
  "culturalNotes": string[],
  "visualReferences": string[],
  "storytellingReferences": string[],
  "emotionalDirection": string[],
  "keyFacts": string[]
}

Use plausible, general knowledge. Do not invent specific statistics or quotes. Flag uncertainty in keyFacts when needed.`

const researchItem = z.string().min(1).max(AI_PLANNING_LIST_ITEM_MAX)

const researchSchema = z.object({
  topics: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
  culturalNotes: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  visualReferences: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  storytellingReferences: aiPlanningTextArray().pipe(z.array(researchItem).max(32)),
  emotionalDirection: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
  keyFacts: aiPlanningTextArray().pipe(z.array(researchItem).min(1).max(32)),
})

export type V7ResearchBrief = z.infer<typeof researchSchema>

export async function runV7Research(params: {
  brief: V7CreativeBrief
  productionId?: string
}): Promise<{ research: V7ResearchBrief; durationMs: number }> {
  const started = Date.now()
  const raw = await generateV7StructuredJson({
    agent: 'v7-research',
    systemPrompt: RESEARCH_SYSTEM,
    userPrompt: `PRODUCTION:\n${JSON.stringify(params.brief, null, 2)}`,
    temperature: 0.4,
    projectId: params.productionId,
  })

  return { research: researchSchema.parse(raw), durationMs: Date.now() - started }
}
