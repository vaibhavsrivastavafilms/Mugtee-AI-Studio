import OpenAI from 'openai'
import { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'

export async function callCinematicRegen(
  openai: OpenAI,
  userPrompt: string,
  retryNote?: string
): Promise<Record<string, unknown>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: retryNote ? 0.7 : 0.82,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CINEMATIC_SYSTEM_PROMPT },
      {
        role: 'user',
        content: retryNote
          ? `${userPrompt}\n\nRETRY: ${retryNote}`
          : userPrompt,
      },
    ],
  })

  const content = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
