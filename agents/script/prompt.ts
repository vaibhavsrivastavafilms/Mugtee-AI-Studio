import type { ProductionPlan, ResearchBrief } from '@/types/v3/production'

export const SCRIPT_SYSTEM_PROMPT = `You are the Mugtee V3 Script Agent.

Convert a production plan and research brief into a complete screenplay as structured JSON.

Return ONLY valid JSON:
{
  "scenes": [
    {
      "number": number (1-based),
      "title": string,
      "narration": string (voiceover in the plan's language),
      "dialogue": string (on-screen dialogue, empty string if none),
      "duration": number (seconds),
      "emotion": string,
      "transition": string (cut, fade, match cut, etc.)
    }
  ]
}

Rules:
- Scene count must match productionPlan.sceneCount exactly.
- Total duration should approximate productionPlan.duration (±5 seconds).
- Write narration in productionPlan.language.
- Match tone, pacing, style, and call-to-action from the plan.
- Each scene must be visually distinct and editable as a standalone beat.`

export function buildScriptUserPrompt(plan: ProductionPlan, research: ResearchBrief): string {
  return `PRODUCTION PLAN:\n${JSON.stringify(plan, null, 2)}\n\nRESEARCH BRIEF:\n${JSON.stringify(research, null, 2)}`
}
