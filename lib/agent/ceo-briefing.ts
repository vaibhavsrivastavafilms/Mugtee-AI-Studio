import type { CeoBriefing, CreatorAgentContext } from '@/lib/agent/types'
import { buildWeeklyContentPlan } from '@/lib/agent/weekly-content-planner'
import { topOpportunityForBrief } from '@/lib/agent/content-opportunity-feed'
import { buildSmartSuggestions } from '@/lib/agent/smart-suggestions'
import { weekStartDate } from '@/lib/agent/agent-context'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'

function rulesBriefing(ctx: CreatorAgentContext, weekOf: string): CeoBriefing {
  const topics = Object.entries(ctx.topicCounts).sort((a, b) => b[1] - a[1])
  const topTopic = topics[0]?.[0]
  const plan = buildWeeklyContentPlan(ctx, weekOf)
  const opportunity = topOpportunityForBrief(ctx, weekOf)
  const suggestions = buildSmartSuggestions(ctx)

  const worked = topTopic
    ? [`${topTopic} themes resonated in your recent work`]
    : ['Consistent creation sessions building your catalog']
  const failed = topics.length < 2 ? ['Not enough topic diversity yet — test one new angle'] : []
  const doubleDown = topTopic ? [`More ${topTopic} content with tighter hooks`] : ['Your signature niche angle']
  const opportunities = opportunity
    ? [opportunity.title, opportunity.why ?? opportunity.description ?? ''].filter(Boolean)
    : ['Check your daily opportunity feed']
  const nextContent = plan.slots.slice(0, 3).map((s) => s.title)

  return {
    weekOf,
    headline: `Week of ${weekOf}: ${ctx.niche ?? 'Creator'} momentum report`,
    worked,
    failed,
    doubleDown,
    opportunities,
    nextContent,
    cinematicNarrative: suggestions[0]?.body,
    source: 'rules',
  }
}

async function openAiBriefing(
  ctx: CreatorAgentContext,
  weekOf: string,
  base: CeoBriefing
): Promise<CeoBriefing> {
  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.4,
      max_tokens: 320,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Write a weekly creator CEO briefing. Return JSON: headline (string), cinematicNarrative (2-3 cinematic sentences), worked/failed/doubleDown/opportunities/nextContent (string arrays, 1-3 items each). Tone: direct, cinematic, encouraging.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            weekOf,
            niche: ctx.niche,
            platform: ctx.platform,
            topTopics: Object.keys(ctx.topicCounts).slice(0, 5),
            baseBrief: base,
          }),
        },
      ],
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return base
    const parsed = JSON.parse(text) as Partial<CeoBriefing>
    return {
      ...base,
      headline: parsed.headline ?? base.headline,
      cinematicNarrative: parsed.cinematicNarrative ?? base.cinematicNarrative,
      worked: parsed.worked?.length ? parsed.worked : base.worked,
      failed: parsed.failed?.length ? parsed.failed : base.failed,
      doubleDown: parsed.doubleDown?.length ? parsed.doubleDown : base.doubleDown,
      opportunities: parsed.opportunities?.length ? parsed.opportunities : base.opportunities,
      nextContent: parsed.nextContent?.length ? parsed.nextContent : base.nextContent,
      source: 'openai',
    }
  } catch {
    return base
  }
}

export async function buildCeoBriefing(
  ctx: CreatorAgentContext,
  opts?: { useOpenAi?: boolean; weekOf?: string }
): Promise<CeoBriefing> {
  const weekOf = opts?.weekOf ?? weekStartDate()
  const base = rulesBriefing(ctx, weekOf)
  if (opts?.useOpenAi && process.env.OPENAI_API_KEY?.trim()) {
    return openAiBriefing(ctx, weekOf, base)
  }
  return base
}
