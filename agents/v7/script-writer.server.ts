import 'server-only'

import { z } from 'zod'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import { resolveActiveTextProvider } from '@/lib/ai/config'
import {
  assertV7TextBudgetRemaining,
  createV7TextGenerationDeadline,
  generateV7BoundedText,
  generateV7StructuredJson,
} from '@/lib/v7/providers/text.server'
import { V7ProviderRequestError } from '@/lib/v7/providers/text-errors.server'
import { v7LanguageDirectiveForBrief } from '@/lib/v7/language-routing.core'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ResearchBrief } from '@/agents/v7/research.server'
import {
  buildScreenplayRepairUserPrompt,
  MAX_SCREENPLAY_ATTEMPTS,
  validateScreenplayDocument,
  type V7ScriptDocument,
} from '@/agents/v7/script-schema'

export type { V7ScriptDocument } from '@/agents/v7/script-schema'

const SCRIPT_SYSTEM = `You are the Mugtee Script Writer and Screenplay Engine.

Write an original, dialogue-driven, family-friendly screenplay optimized for the target platform.

Return ONLY JSON:
{
  "scenes": [
    {
      "number": number,
      "title": string,
      "duration": number,
      "location": string,
      "characters": string[],
      "dialogue": string,
      "action": string,
      "camera": string,
      "lighting": string,
      "movement": string,
      "emotion": string,
      "transition": string,
      "narration": string
    }
  ]
}

Rules:
- Scene count must match the production brief.
- Include hook in scene 1 and CTA in the final scene when appropriate.
- EVERY required string field MUST contain meaningful, non-empty content after trimming.
- Do NOT use "", "N/A", "none", "TBD", or placeholders for required fields.
- dialogue may be "" only when a scene has no spoken dialogue; all other fields remain required.
- For every scene, write concrete location, action, narration, camera, lighting, movement, emotion, and transition.
- scenes[n].narration must always contain voiceover narration text in the production language.
- scenes[n].action must describe visible on-screen action.
- scenes[n].location must name the setting.`

function normalizeStructuredObject(parsed: unknown): Record<string, unknown> | null {
  if (Array.isArray(parsed)) {
    if (parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
      return parsed[0] as Record<string, unknown>
    }
    return null
  }
  if (parsed && typeof parsed === 'object') {
    return parsed as Record<string, unknown>
  }
  return null
}

function logScreenplayValidationDiagnostic(params: {
  attempt: number
  model: string | null
  productionId?: string
  sceneCount: number | null
  topLevelKeys: string[]
  validationErrors: string[]
}): void {
  console.warn('[v7-script] screenplay schema validation failed', {
    attempt: params.attempt,
    model: params.model,
    projectId: params.productionId ?? null,
    sceneCount: params.sceneCount,
    topLevelKeys: params.topLevelKeys,
    validationErrors: params.validationErrors,
  })
}

export async function runV7ScriptWriter(params: {
  brief: V7CreativeBrief
  research: V7ResearchBrief
  direction: V7CreativeDirection
  productionId?: string
}): Promise<{ script: V7ScriptDocument; durationMs: number }> {
  const started = Date.now()
  const provider = resolveActiveTextProvider()
  const deadlineMs = createV7TextGenerationDeadline()
  const languageLock = v7LanguageDirectiveForBrief(params.brief)
  const baseUserPrompt = `BRIEF:\n${JSON.stringify(params.brief)}\n\nRESEARCH:\n${JSON.stringify(params.research)}\n\nCREATIVE:\n${JSON.stringify(params.direction)}`
  let userPrompt = baseUserPrompt
  let lastModel: string | null = null
  let lastValidationErrors: string[] = []

  for (let attempt = 0; attempt < MAX_SCREENPLAY_ATTEMPTS; attempt++) {
    assertV7TextBudgetRemaining(deadlineMs, provider)

    let raw: Record<string, unknown>

    if (attempt === 0) {
      raw = await generateV7StructuredJson({
        agent: 'v7-script',
        systemPrompt: `${SCRIPT_SYSTEM}\n\n${languageLock}`,
        userPrompt,
        temperature: 0.5,
        projectId: params.productionId,
        deadlineMs,
      })
      lastModel = 'structured-json'
    } else {
      const result = await generateV7BoundedText({
        agent: 'v7-script',
        systemPrompt: `${SCRIPT_SYSTEM}\n\n${languageLock}`,
        userPrompt,
        temperature: 0.35,
        projectId: params.productionId,
        deadlineMs,
      })
      lastModel = result.model
      const parsed = normalizeStructuredObject(parseLlmJsonText(result.text))
      if (!parsed || Object.keys(parsed).length === 0) {
        lastValidationErrors = ['response: invalid or empty JSON object']
        logScreenplayValidationDiagnostic({
          attempt: attempt + 1,
          model: lastModel,
          productionId: params.productionId,
          sceneCount: null,
          topLevelKeys: [],
          validationErrors: lastValidationErrors,
        })
        userPrompt = buildScreenplayRepairUserPrompt({
          baseUserPrompt,
          validationErrors: lastValidationErrors,
        })
        continue
      }
      raw = parsed
    }

    const scenes = Array.isArray(raw.scenes) ? raw.scenes : null
    const validation = validateScreenplayDocument(raw)

    if (validation.ok) {
      if (attempt > 0) {
        console.info('[v7-script] screenplay schema validation recovered', {
          attempt: attempt + 1,
          model: lastModel,
          projectId: params.productionId ?? null,
          sceneCount: validation.data.scenes.length,
        })
      }
      return { script: validation.data, durationMs: Date.now() - started }
    }

    lastValidationErrors = validation.errors
    logScreenplayValidationDiagnostic({
      attempt: attempt + 1,
      model: lastModel,
      productionId: params.productionId,
      sceneCount: scenes?.length ?? null,
      topLevelKeys: Object.keys(raw),
      validationErrors: lastValidationErrors,
    })

    if (attempt >= MAX_SCREENPLAY_ATTEMPTS - 1) break

    userPrompt = buildScreenplayRepairUserPrompt({
      baseUserPrompt,
      validationErrors: lastValidationErrors,
    })
  }

  throw new V7ProviderRequestError('PROVIDER_INVALID_RESPONSE', provider, {
    message: `Screenplay schema validation failed after ${MAX_SCREENPLAY_ATTEMPTS} attempts: ${lastValidationErrors[0] ?? 'invalid JSON shape'}`,
    cause:
      lastValidationErrors.length > 0
        ? new z.ZodError(
            lastValidationErrors.map((message) => ({
              code: 'custom',
              message,
              path: [],
            }))
          )
        : undefined,
  })
}
