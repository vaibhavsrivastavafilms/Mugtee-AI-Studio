import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import {
  mergeCreativeCompanionBrief,
  normalizeContentBrief,
  type ContentBrief,
  type ContentBriefInput,
} from '@/lib/content-director/content-brief'
import {
  generateRulesContentBriefSync,
  rulesBasedContentBrief,
  type GenerateContentBriefResult,
} from '@/lib/content-director/rules-content-brief'
import type { ParsedCreatorIntent } from '@/lib/input-understanding'

export type { GenerateContentBriefResult }
export { generateRulesContentBriefSync, rulesBasedContentBrief }

async function aiEnhanceBrief(
  base: ContentBrief,
  input: ContentBriefInput
): Promise<ContentBrief> {
  if (!process.env.OPENAI_API_KEY?.trim()) return base

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You refine a content brief for short-form video. Return JSON only with keys: audience, coreNarrative, keyInsights (array, max 4), emotionalAngle, desiredOutcome, ctaDirection. Keep each field concise.',
        },
        {
          role: 'user',
          content: [
            `Topic: ${base.topic}`,
            `Platform: ${base.platform}`,
            `Tone: ${base.tone}`,
            `Niche: ${input.niche ?? 'general'}`,
            `Draft narrative: ${base.coreNarrative}`,
            input.creativeBrief?.theme ? `Creator theme: ${input.creativeBrief.theme}` : '',
            input.creativeBrief?.emotion ? `Creator emotion: ${input.creativeBrief.emotion}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const json = JSON.parse(raw) as Record<string, unknown>
    const merged = normalizeContentBrief({ ...base, ...json, topic: base.topic })
    return merged ? mergeCreativeCompanionBrief(merged, input.creativeBrief) : base
  } catch {
    return base
  }
}

function contentBriefLlmEnabled(): boolean {
  return process.env.CONTENT_BRIEF_LLM === 'true'
}

/** Fast brief synthesis — rules first, optional single OpenAI pass when CONTENT_BRIEF_LLM=true. */
export async function generateContentBrief(
  input: ContentBriefInput,
  options?: { useAi?: boolean; parsedIntent?: ParsedCreatorIntent | null }
): Promise<GenerateContentBriefResult> {
  const started = performance.now()
  const rules = rulesBasedContentBrief(input, options?.parsedIntent)
  const useAi = options?.useAi ?? contentBriefLlmEnabled()

  if (!useAi) {
    return {
      brief: rules,
      source: 'rules',
      durationMs: Math.round(performance.now() - started),
    }
  }

  const enhanced = await aiEnhanceBrief(rules, input)
  return {
    brief: enhanced,
    source: process.env.OPENAI_API_KEY?.trim() ? 'ai' : 'rules',
    durationMs: Math.round(performance.now() - started),
  }
}
