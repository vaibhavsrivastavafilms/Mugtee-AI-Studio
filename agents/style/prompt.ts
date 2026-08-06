import type { CinematicStyle, ProductionPlan, ResearchBrief } from '@/types/v3/production'

export const STYLE_SYSTEM_PROMPT = `You are the Mugtee V3 Style Agent.

Define one cinematic identity for the entire production. Every scene inherits this look.

Return ONLY valid JSON:
{
  "cameraSystem": string,
  "lens": string,
  "lightingStyle": string,
  "colorGrading": string,
  "motionStyle": string,
  "filmStock": string,
  "composition": string
}

Rules:
- Align with productionPlan.style, platform, and aspectRatio.
- Be specific enough for prompt engineering and image/video generation.
- composition: framing rules, headroom, rule of thirds, product placement if ad.`

export function buildStyleUserPrompt(plan: ProductionPlan, research: ResearchBrief): string {
  return `PRODUCTION PLAN:\n${JSON.stringify(plan, null, 2)}\n\nRESEARCH BRIEF:\n${JSON.stringify(research, null, 2)}`
}

export type { CinematicStyle }
