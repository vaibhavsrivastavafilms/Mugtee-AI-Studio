import {
  STORY_FRAMEWORK_IDS,
  STORY_FRAMEWORKS,
  selectStoryFramework,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import type { StoryFrameworkRecommendation } from '@/lib/director/framework-types'
import type { StoryDirectionOption } from '@/lib/director/types'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'

export type FrameworkRecommendationInput = {
  idea: string
  storyDirection?: StoryDirectionOption | null
  creatorDna?: {
    niche?: string
    tone?: string
    platform?: string
    emotionalGoal?: string
  }
}

const FRAMEWORK_KEYWORDS: Record<StoryFrameworkId, RegExp> = {
  'belief-shift': /\b(belief|myth|wrong|truth|assume|misconception|actually|debunk)\b/i,
  'transformation-story': /\b(transform|before|after|journey|change|habit|become|used to)\b/i,
  'failure-to-wisdom': /\b(fail|mistake|loss|learned|regret|wrong|lesson|costly)\b/i,
  'experiment-story': /\b(try|test|experiment|challenge|days|week|hypothesis|results)\b/i,
  'contrarian-reveal': /\b(everyone|contrarian|unpopular|stop|instead|opposite|norm)\b/i,
  'creator-spotlight': /\b(how i made|behind|process|craft|create|build|studio|workflow)\b/i,
  'routine-rewrite': /\b(routine|habit|morning|workflow|system|redesign|optimize|default)\b/i,
}

function scoreFramework(
  id: StoryFrameworkId,
  blob: string,
  niche?: string,
  emotionalGoal?: string
): number {
  let score = FRAMEWORK_KEYWORDS[id].test(blob) ? 3 : 0
  const fw = STORY_FRAMEWORKS[id]
  for (const tag of fw.bestFor) {
    if (blob.includes(tag.replace(/-/g, ' ')) || blob.includes(tag)) score += 1
  }
  if (niche) {
    const n = niche.toLowerCase()
    if (n.includes('psych') && id === 'belief-shift') score += 2
    if (n.includes('fitness') && id === 'transformation-story') score += 2
    if (n.includes('finance') && id === 'failure-to-wisdom') score += 2
    if (n.includes('productivity') && id === 'routine-rewrite') score += 2
  }
  if (emotionalGoal) {
    const e = emotionalGoal.toLowerCase()
    if (e.includes('curiosity') && id === 'experiment-story') score += 1
    if (e.includes('trust') && id === 'failure-to-wisdom') score += 1
    if (e.includes('inspire') && id === 'transformation-story') score += 1
  }
  return score
}

function heuristicRecommendation(
  id: StoryFrameworkId,
  rank: number,
  input: FrameworkRecommendationInput
): StoryFrameworkRecommendation {
  const fw = STORY_FRAMEWORKS[id]
  const direction = input.storyDirection
  const title = direction
    ? `${fw.label}: ${direction.title}`
    : `${fw.label} for "${input.idea.slice(0, 48)}${input.idea.length > 48 ? '…' : ''}"`

  const baseConfidence = Math.max(55, 92 - rank * 12)
  const acts = fw.structure

  return {
    framework: id,
    title,
    coreEmotion: fw.emotionalArc.split('→').map((s) => s.trim())[0] || fw.emotionalArc,
    audienceDesire: direction?.emotionalPromise || `Feel ${fw.emotionalArc.split('→').pop()?.trim() || 'moved'}`,
    narrativeTension: acts[1]?.purpose || fw.tagline,
    curiosityGap: fw.hookPattern,
    transformation: acts[2]?.purpose || fw.tagline,
    confidenceScore: baseConfidence,
  }
}

function rankFrameworks(input: FrameworkRecommendationInput): StoryFrameworkId[] {
  const blob = [
    input.idea,
    input.storyDirection?.logline,
    input.storyDirection?.hook,
    input.storyDirection?.emotionalPromise,
    input.creatorDna?.niche,
    input.creatorDna?.emotionalGoal,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const primary = selectStoryFramework({
    userIdea: input.idea,
    niche: input.creatorDna?.niche,
    emotionalGoal: input.creatorDna?.emotionalGoal || input.storyDirection?.emotionalPromise,
    hookStyle: input.storyDirection?.hook,
  })

  const scored = STORY_FRAMEWORK_IDS.map((id) => ({
    id,
    score: scoreFramework(id, blob, input.creatorDna?.niche, input.creatorDna?.emotionalGoal),
  }))
    .sort((a, b) => b.score - a.score)

  const ordered: StoryFrameworkId[] = [primary]
  for (const { id } of scored) {
    if (!ordered.includes(id)) ordered.push(id)
  }
  return ordered.slice(0, 3)
}

const RECOMMENDATION_SYSTEM = `You are a Hollywood story strategist. Given an idea, story direction, and three candidate narrative frameworks, polish each recommendation with specific, non-generic copy.

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "framework": "<one of: belief-shift, transformation-story, failure-to-wisdom, experiment-story, contrarian-reveal, creator-spotlight, routine-rewrite>",
      "title": "string",
      "coreEmotion": "string",
      "audienceDesire": "string",
      "narrativeTension": "string",
      "curiosityGap": "string",
      "transformation": "string",
      "confidenceScore": 0-100
    }
  ]
}
Exactly 3 recommendations. confidenceScore must decrease from best fit to third. Be concrete to the user's topic.`

async function polishWithLlm(
  input: FrameworkRecommendationInput,
  heuristic: StoryFrameworkRecommendation[]
): Promise<StoryFrameworkRecommendation[] | null> {
  if (!hasAnyTextProviderKey()) return null

  const fwSummaries = heuristic
    .map((r) => {
      const fw = STORY_FRAMEWORKS[r.framework]
      return `- ${r.framework}: ${fw.label} — ${fw.tagline}`
    })
    .join('\n')

  const userPrompt = [
    `IDEA: ${input.idea}`,
    input.storyDirection
      ? `STORY DIRECTION: ${input.storyDirection.title} — ${input.storyDirection.logline} (hook: ${input.storyDirection.hook})`
      : '',
    input.creatorDna?.niche ? `NICHE: ${input.creatorDna.niche}` : '',
    input.creatorDna?.tone ? `TONE: ${input.creatorDna.tone}` : '',
    `CANDIDATE FRAMEWORKS:\n${fwSummaries}`,
    'Polish the three recommendations with topic-specific emotional language.',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const result = await generateScriptViaRouter({
      systemPrompt: RECOMMENDATION_SYSTEM,
      userPrompt,
      topic: input.idea,
      temperature: 0.75,
      contextInput: { topic: input.idea, niche: input.creatorDna?.niche, tone: input.creatorDna?.tone },
    })

    const parsed = parseLlmJsonText(JSON.stringify(result.parsed)) as { recommendations?: unknown[] }
    if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length < 3) return null

    const out: StoryFrameworkRecommendation[] = []
    for (let i = 0; i < 3; i++) {
      const raw = parsed.recommendations[i] as Record<string, unknown>
      const framework = String(raw.framework || heuristic[i]!.framework) as StoryFrameworkId
      if (!STORY_FRAMEWORK_IDS.includes(framework)) continue
      out.push({
        framework,
        title: String(raw.title || heuristic[i]!.title),
        coreEmotion: String(raw.coreEmotion || heuristic[i]!.coreEmotion),
        audienceDesire: String(raw.audienceDesire || heuristic[i]!.audienceDesire),
        narrativeTension: String(raw.narrativeTension || heuristic[i]!.narrativeTension),
        curiosityGap: String(raw.curiosityGap || heuristic[i]!.curiosityGap),
        transformation: String(raw.transformation || heuristic[i]!.transformation),
        confidenceScore: Math.min(
          100,
          Math.max(40, Number(raw.confidenceScore) || heuristic[i]!.confidenceScore)
        ),
      })
    }
    return out.length === 3 ? out : null
  } catch {
    return null
  }
}

/** Generate three intelligent framework recommendations (heuristic rank + optional LLM polish). */
export async function generateFrameworkRecommendations(
  input: FrameworkRecommendationInput
): Promise<StoryFrameworkRecommendation[]> {
  const ranked = rankFrameworks(input)
  const heuristic = ranked.map((id, i) => heuristicRecommendation(id, i, input))
  const polished = await polishWithLlm(input, heuristic)
  return polished ?? heuristic
}
