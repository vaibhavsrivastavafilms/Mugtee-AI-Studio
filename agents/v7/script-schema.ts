import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_NARRATIVE_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation'

export const MAX_SCREENPLAY_ATTEMPTS = 3

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

export const v7ScriptSchema = z.object({
  scenes: z.array(z.object(scriptSceneFields)).min(1),
})

export type V7ScriptDocument = z.infer<typeof v7ScriptSchema>

export function formatZodIssuePath(path: PropertyKey[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`
    return acc ? `${acc}.${String(segment)}` : String(segment)
  }, '')
}

export function formatScreenplayValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = formatZodIssuePath(issue.path)
    return path ? `${path}: ${issue.message}` : issue.message
  })
}

export function validateScreenplayDocument(raw: unknown):
  | { ok: true; data: V7ScriptDocument }
  | { ok: false; errors: string[] } {
  const parsed = v7ScriptSchema.safeParse(raw)
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  return { ok: false, errors: formatScreenplayValidationErrors(parsed.error) }
}

export function buildScreenplayRepairUserPrompt(params: {
  baseUserPrompt: string
  validationErrors: string[]
}): string {
  const issues = params.validationErrors.map((line) => `- ${line}`).join('\n')
  return `${params.baseUserPrompt}

SCHEMA VALIDATION FAILURE:
${issues}

Return the COMPLETE corrected screenplay JSON object.
Every required string field must contain meaningful non-empty content.
Do not use "", "N/A", "none", or placeholders for required fields.
dialogue may be "" only when a scene has no spoken dialogue.
Do not return explanations or partial patches.`
}
