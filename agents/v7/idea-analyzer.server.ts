import 'server-only'

import { z } from 'zod'
import { generateV7StructuredJson } from '@/lib/v7/providers/text.server'
import {
  normalizeProductionPlanning,
  PRODUCTION_DEFAULT_DURATION_SEC,
  PRODUCTION_DURATION_MAX_SEC,
  PRODUCTION_DURATION_MIN_SEC,
  PRODUCTION_SCENE_COUNT_MAX,
  PRODUCTION_SCENE_COUNT_MIN,
} from '@/lib/v7/production-planning.server'
import {
  AI_PLANNING_DIRECTION_MAX,
  AI_PLANNING_LABEL_MAX,
  AI_PLANNING_TITLE_MAX,
  aiPlanningText,
  aiPlanningTextOptional,
} from '@/lib/v7/creative-planning-validation.server'
import {
  applyResolvedV7LanguageToBrief,
  buildV7FramedUserInput,
} from '@/lib/v7/language-routing.core'
import { V7_CINEMATIC_DEFAULT_DURATION_SEC } from '@/lib/v7/cinematic-video-framework.core'
import type { V7CreativeBrief } from '@/types/v7/production'

const IDEA_SYSTEM = `You are the Mugtee Idea Analyzer — the production brain of an autonomous AI film studio.

The creator provides ONE idea. You return ONLY valid JSON (no markdown):
{
  "title": string,
  "duration": number (${PRODUCTION_DURATION_MIN_SEC}-${PRODUCTION_DURATION_MAX_SEC} seconds — honor explicit user duration),
  "platform": "Instagram" | "TikTok" | "YouTube Shorts" | "YouTube" | "LinkedIn" | "Facebook",
  "language": string,
  "aspectRatio": "9:16" | "16:9" | "1:1" | "4:5",
  "genre": string,
  "style": string,
  "sceneCount": number (${PRODUCTION_SCENE_COUNT_MIN}-${PRODUCTION_SCENE_COUNT_MAX} — scale to duration; short films may use 1-2 scenes),
  "voiceDirection": string,
  "musicDirection": string,
  "emotion": string,
  "audience": string,
  "characterConsistency": boolean,
  "callToAction": string (optional),
  "brand": string (optional),
  "location": string (optional)
}

Rules:
- The user prompt is the source of truth for duration, style, and format (e.g. 5s logo, 10s B&W film, 2-minute doc).
- Write rich, detailed creative direction when the user asks for cinematic specificity — do not shorten music, voice, or visual guidance.
- Never inflate duration or scene count beyond what the request needs.
- Minimalist, experimental, silent, or single-scene requests are valid.
- Infer platform, language, and aspect ratio from context. Vertical 9:16 for Shorts/Reels unless landscape requested.
- Default duration ${V7_CINEMATIC_DEFAULT_DURATION_SEC}s only when the user gives no timing hint.`

const briefSchema = z.object({
  title: aiPlanningText(AI_PLANNING_TITLE_MAX),
  duration: z.coerce.number().int().min(PRODUCTION_DURATION_MIN_SEC).max(PRODUCTION_DURATION_MAX_SEC),
  platform: z.enum([
    'Instagram',
    'TikTok',
    'YouTube Shorts',
    'YouTube',
    'LinkedIn',
    'Facebook',
  ]),
  language: aiPlanningText(AI_PLANNING_LABEL_MAX),
  aspectRatio: z.enum(['9:16', '16:9', '1:1', '4:5']),
  genre: aiPlanningText(AI_PLANNING_LABEL_MAX),
  style: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  sceneCount: z.coerce.number().int().min(PRODUCTION_SCENE_COUNT_MIN).max(PRODUCTION_SCENE_COUNT_MAX),
  voiceDirection: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  musicDirection: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  emotion: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  audience: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
  characterConsistency: z.coerce.boolean(),
  callToAction: aiPlanningTextOptional(AI_PLANNING_DIRECTION_MAX),
  brand: aiPlanningTextOptional(AI_PLANNING_DIRECTION_MAX),
  location: aiPlanningTextOptional(AI_PLANNING_DIRECTION_MAX),
})

export async function runV7IdeaAnalyzer(params: {
  prompt: string
  productionId?: string
}): Promise<{ brief: V7CreativeBrief; durationMs: number }> {
  const started = Date.now()
  const userPrompt = params.prompt.trim()

  const raw = await generateV7StructuredJson({
    agent: 'v7-idea',
    systemPrompt: IDEA_SYSTEM,
    userPrompt: buildV7FramedUserInput(userPrompt, 'CREATOR IDEA'),
    temperature: 0.35,
    projectId: params.productionId,
  })

  const parsed = briefSchema.parse(raw)
  const plan = normalizeProductionPlanning({
    prompt: userPrompt,
    duration: parsed.duration,
    sceneCount: parsed.sceneCount,
  })

  const brief: V7CreativeBrief = applyResolvedV7LanguageToBrief(
    {
      ...parsed,
      duration: plan.duration,
      sceneCount: plan.sceneCount,
    },
    userPrompt
  )

  return { brief, durationMs: Date.now() - started }
}
