import type { ProductionPlan, ScriptDocument, StoryboardDocument } from '@/types/v3/production'

export const LOCATION_SYSTEM_PROMPT = `You are the Mugtee V3 Location Agent.

Define reusable production locations so scenes reference shared environment memory instead of repeating descriptions.

Return ONLY valid JSON:
{
  "locations": [
    {
      "locationId": string (slug),
      "name": string,
      "lighting": string,
      "mood": string,
      "architecture": string,
      "weather": string,
      "environment": string,
      "cameraRestrictions": string,
      "sceneNumbers": number[]
    }
  ]
}

Rules:
- Deduplicate similar settings into one location.
- Every scene number must appear in exactly one location's sceneNumbers.
- Ground locations in productionPlan.location, style, and storyboard shot locations.
- cameraRestrictions: note drone limits, interior width, practical lighting constraints.`

export function buildLocationUserPrompt(
  plan: ProductionPlan,
  script: ScriptDocument,
  storyboard: StoryboardDocument
): string {
  return `PRODUCTION PLAN:\n${JSON.stringify(plan, null, 2)}\n\nSCREENPLAY:\n${JSON.stringify(script, null, 2)}\n\nSTORYBOARD:\n${JSON.stringify(storyboard, null, 2)}`
}
