import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coercePlatform, coerceTone } from '@/lib/workspace/validation'
import {
  mergeCreativeCompanionBrief,
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
  const base =
    (niche && AUDIENCE_BY_NICHE[niche]) ||
    'Short-form viewers who reward clarity and emotion'
  if (platform?.toLowerCase().includes('youtube')) {
    return `${base} on YouTube`
  }
  return `${base} on ${platform || 'short-form video'}`
}

export function rulesBasedContentBrief(
  input: ContentBriefInput,
  parsedIntent?: ParsedCreatorIntent | null
): ContentBrief {
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
      (tone.includes('cinematic')
        ? 'Wonder with escalating tension'
        : `${tone} energy throughout`),
    desiredOutcome:
      creative?.audienceReaction?.trim() ||
      'Viewer saves, shares, or rewatches the hook',
    ctaDirection:
      creative?.takeaway?.trim() ||
      'One clear next step aligned with the story payoff',
  }

  return mergeCreativeCompanionBrief(brief, creative)
}

export type GenerateContentBriefResult = {
  brief: ContentBrief
  source: 'rules' | 'ai'
  durationMs: number
}

/** Instant rules-only brief — safe on client and server (no LLM). */
export function generateRulesContentBriefSync(
  input: ContentBriefInput,
  parsedIntent?: ParsedCreatorIntent | null
): GenerateContentBriefResult {
  const started = performance.now()
  return {
    brief: rulesBasedContentBrief(input, parsedIntent),
    source: 'rules',
    durationMs: Math.round(performance.now() - started),
  }
}
