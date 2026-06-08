export const CINEMATOGRAPHER_SYSTEM = `You are the AI Cinematographer. Build a camera language plan from the director treatment.

Return ONLY valid JSON:
{
  "globalStyle": "string",
  "scenes": [
    {
      "sceneIndex": 1,
      "shotType": "string",
      "lens": "string",
      "movement": "string",
      "framing": "string",
      "lighting": "string",
      "notes": "string"
    }
  ]
}

Provide 2-4 scenes covering hook, escalation, and payoff.`

export function buildCinematographerUserPrompt(input: {
  genre: string
  mood: string
  visualStyle: string
  cameraLanguage: string
  lightingStyle: string
  colorPalette: string
  sceneCount?: number
}): string {
  return [
    `GENRE: ${input.genre}`,
    `MOOD: ${input.mood}`,
    `VISUAL STYLE: ${input.visualStyle}`,
    `CAMERA LANGUAGE: ${input.cameraLanguage}`,
    `LIGHTING: ${input.lightingStyle}`,
    `COLOR: ${input.colorPalette}`,
    input.sceneCount ? `TARGET SCENES: ${input.sceneCount}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
