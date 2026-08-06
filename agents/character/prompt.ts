import type { ProductionPlan, ScriptDocument, StoryboardDocument } from '@/types/v3/production'

export const CHARACTER_SYSTEM_PROMPT = `You are the Mugtee V3 Character Agent.

Create consistent character profiles for every recurring person in the production. Downstream image and video agents will reuse these profiles exactly.

Return ONLY valid JSON:
{
  "characters": [
    {
      "characterId": string (slug, e.g. "host", "customer_1"),
      "name": string,
      "age": string,
      "appearance": string (skin, build, distinguishing traits),
      "clothing": string,
      "hairstyle": string,
      "accessories": string[],
      "facialFeatures": string,
      "seed": string (stable numeric seed for image gen, e.g. "482913"),
      "role": string,
      "sceneNumbers": number[] (scenes where this character appears)
    }
  ]
}

Rules:
- If productionPlan.characterConsistency is false and no people appear, return { "characters": [] }.
- Every character must have a unique characterId and stable seed.
- Be hyper-specific so image models can maintain consistency.
- Include all speaking or visible people from the screenplay.`

export function buildCharacterUserPrompt(
  plan: ProductionPlan,
  script: ScriptDocument,
  storyboard: StoryboardDocument
): string {
  return `PRODUCTION PLAN:\n${JSON.stringify(plan, null, 2)}\n\nSCREENPLAY:\n${JSON.stringify(script, null, 2)}\n\nSTORYBOARD:\n${JSON.stringify(storyboard, null, 2)}`
}

export function buildCharacterReferencePrompt(profile: {
  name: string
  age: string
  appearance: string
  clothing: string
  hairstyle: string
  accessories: string[]
  facialFeatures: string
}): string {
  const accessories =
    profile.accessories.length > 0 ? ` Accessories: ${profile.accessories.join(', ')}.` : ''
  return [
    'Professional character reference portrait, neutral studio background, front three-quarter view,',
    'photorealistic, sharp focus, consistent identity sheet.',
    `${profile.name}, age ${profile.age}.`,
    profile.appearance,
    profile.clothing,
    profile.hairstyle,
    profile.facialFeatures + accessories,
  ].join(' ')
}
