import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coercePlatform, coerceTone } from '@/lib/workspace/validation'
import {
  mergeCreativeCompanionBrief,
  normalizeContentBrief,
  type ContentBrief,
  type ContentBriefInput,
} from '@/lib/content-director/content-brief'
import { resolveGenerationTopic, type ParsedCreatorIntent } from '@/lib/input-understanding'

const AUDIENCE_BY_NICHE: Record<string, string> = {
  storytelling: 'Curious scrollers who love emotional micro-stories',
  finance: 'Ambitious viewers seeking practical money insights',
  history: 'History buffs and wonder-seekers on short-form video',
  psychology: 'Self-improvement audience craving relatable truths',
  mystery: 'Thriller fans who stay for the reveal',
  motivation: 'Creators and hustlers needing a quick lift',
  tech: 'Early adopters scanning for sharp explainers',
  health: 'Wellness-minded viewers seeking actionable tips',
}

function defaultAudience(niche?: string, platform?: string): string {
  const base = (niche && AUDIENCE_BY_NICHE[niche]) || 'Short-form viewers who reward clarity and emotion'
  if (platform?.toLowerCase().includes('youtube')) {
    return `${base} on YouTube`
  }
  return `${base} on ${platform || 'short-form video'}`
}

function rulesBasedBrief(input: ContentBriefInput, parsedIntent?: ParsedCreatorIntent | null): ContentBrief {
  const topic = resolveGenerationTopic(parsedIntent, input.topic.trim())
  const niche = input.niche || inferNicheFromBrief({ topic })
  const platform = coercePlatform(input.platform ?? 'shorts')
  const tone = coerceTone(input.tone ?? 'cinematic')
  const creative = input.creativeBrief

  const coreNarrative =
    creative?.theme?.trim() ||
    `A ${tone} ${niche} story about: ${topic.slice(0, 200)}`

  const insights: string[] = []
  if (creative?.protagonist?.trim()) insights.push(creative.protagonist.trim())
  if (creative?.takeaway?.trim()) insights.push(creative.takeaway.trim())
  if (input.duration) insights.push(`Target runtime: ~${input.duration}s`)

  const brief: ContentBrief = {
    topic,
    audience: defaultAudience(niche, platform),
    platform,
    tone,
    coreNarrative: coreNarrative.slice(0, 500),
    keyInsights: insights.slice(0, 6),
    emotionalAngle:
      creative?.emotion?.trim() ||
      (tone.includes('cinematic') ? 'Wonder with escalating tension' : `${tone} energy throughout`),
    desiredOutcome:
      creative?.audienceReaction?.trim() || 'Viewer saves, shares, or rewatches the hook',
    ctaDirection:
      creative?.takeaway?.trim() || 'One clear next step aligned with the story payoff',
  }

  return mergeCreativeCompanionBrief(brief, creative)
}

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

export type GenerateContentBriefResult = {
  brief: ContentBrief
  source: 'rules' | 'ai'
  durationMs: number
}

/** Fast brief synthesis — rules first, optional single OpenAI pass when configured. */
export async function generateContentBrief(
  input: ContentBriefInput,
  options?: { useAi?: boolean; parsedIntent?: ParsedCreatorIntent | null }
): Promise<GenerateContentBriefResult> {
  const started = performance.now()
  const rules = rulesBasedBrief(input, options?.parsedIntent)
  const useAi = options?.useAi !== false

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
