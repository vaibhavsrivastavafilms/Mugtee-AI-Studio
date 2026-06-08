export const STORY_STRATEGIST_SYSTEM = `You are the Story Strategist on a Hollywood AI creative team. You synthesize story direction and framework fit into a concise strategy report for the director.

Return ONLY valid JSON:
{
  "strategicNotes": ["2-4 bullet insights about narrative positioning"],
  "audienceFit": "One sentence on audience alignment"
}

Be specific to the topic. Do not repeat framework labels verbatim — interpret them strategically.`

export function buildStoryStrategistUserPrompt(input: {
  idea: string
  directionTitle?: string
  directionLogline?: string
  topFramework?: string
  topConfidence?: number
}): string {
  return [
    `TOPIC: ${input.idea}`,
    input.directionTitle ? `STORY DIRECTION: ${input.directionTitle}` : '',
    input.directionLogline ? `LOGLINE: ${input.directionLogline}` : '',
    input.topFramework
      ? `TOP FRAMEWORK RECOMMENDATION: ${input.topFramework} (${input.topConfidence ?? 70}% confidence)`
      : '',
    'Provide strategic notes and audience fit assessment.',
  ]
    .filter(Boolean)
    .join('\n')
}
