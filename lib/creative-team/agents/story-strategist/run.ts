import { generateFrameworkRecommendations } from '@/lib/director/framework-recommendation-engine'
import { routeCreativeTeamPrompt } from '@/lib/creative-team/prompt-router'
import type { AgentReport, CreativeTeamContext } from '@/lib/creative-team/types'
import type { StoryStrategyPayload } from '@/lib/creative-team/agents/story-strategist/types'
import {
  STORY_STRATEGIST_SYSTEM,
  buildStoryStrategistUserPrompt,
} from '@/lib/creative-team/agents/story-strategist/prompts'

/** Wraps framework-recommendation-engine + story-direction-engine context. */
export async function runStoryStrategist(ctx: CreativeTeamContext): Promise<AgentReport<StoryStrategyPayload>> {
  const recommendations = await generateFrameworkRecommendations({
    idea: ctx.idea,
    storyDirection: ctx.storyDirection ?? null,
    creatorDna: ctx.creatorDna,
    creatorGraph: ctx.creatorGraph ?? null,
    virloMarket: ctx.virloMarket ?? null,
  })

  const top = recommendations[0]
  const llm = await routeCreativeTeamPrompt({
    systemPrompt: STORY_STRATEGIST_SYSTEM,
    userPrompt: buildStoryStrategistUserPrompt({
      idea: ctx.idea,
      directionTitle: ctx.storyDirection?.title,
      directionLogline: ctx.storyDirection?.logline,
      topFramework: top?.title,
      topConfidence: top?.confidenceScore,
    }),
    topic: ctx.idea,
    ctx,
    temperature: 0.65,
  })

  const strategicNotes =
    (llm?.parsed.strategicNotes as string[] | undefined)?.filter(Boolean) ??
    [
      top
        ? `Lead with ${top.coreEmotion} — ${top.narrativeTension}`
        : 'Sharpen the emotional hook before blueprint.',
      ctx.storyDirection?.audience
        ? `Target: ${ctx.storyDirection.audience}`
        : 'Define audience desire explicitly in the opening beat.',
    ]

  const audienceFit =
    String(llm?.parsed.audienceFit ?? '') ||
    ctx.storyDirection?.audience ||
    'Align payoff with platform-native retention patterns.'

  const payload: StoryStrategyPayload = {
    recommendations,
    strategicNotes,
    audienceFit,
  }

  return {
    agentId: 'story-strategist',
    title: 'Story Strategy Report',
    summary: top ? `${top.title} — ${top.coreEmotion}` : 'Framework recommendations ready',
    preview: strategicNotes[0] ?? audienceFit,
    payload,
    generatedAt: new Date().toISOString(),
  }
}
