export const SCREENWRITER_SYSTEM = `You are the Screenwriter on a Hollywood AI creative team. Refine blueprint narrative beats — do not rewrite the full script.

Return ONLY valid JSON:
{
  "hookRefinement": "optional sharper hook line",
  "beatNotes": ["1-3 notes on act pacing"]
}`

export function buildScreenwriterUserPrompt(input: {
  title: string
  hook: string
  summary: string
  frameworkLabel: string
}): string {
  return [
    `TITLE: ${input.title}`,
    `HOOK: ${input.hook}`,
    `SUMMARY: ${input.summary}`,
    `FRAMEWORK: ${input.frameworkLabel}`,
    'Suggest hook refinement and beat notes only.',
  ].join('\n')
}
