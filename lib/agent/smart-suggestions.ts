import type { CreatorAgentContext, SmartSuggestion } from '@/lib/agent/types'
import { createEntryHref } from '@/lib/create/routes'

export function buildSmartSuggestions(ctx: CreatorAgentContext): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  const topics = Object.entries(ctx.topicCounts).sort((a, b) => b[1] - a[1])

  if (topics.length >= 1) {
    const [topTopic, count] = topics[0]!
    if (count >= 3) {
      suggestions.push({
        id: 'topic-pattern',
        title: `You've explored "${topTopic}" ${Math.round(count)} times`,
        body: 'Double down with a series — audiences reward recognizable themes.',
        actionLabel: 'Start a series reel',
        href: createEntryHref('quick'),
      })
    }
  }

  if (topics.length >= 2) {
    const labels = topics.slice(0, 3).map(([t]) => t)
    suggestions.push({
      id: 'topic-blend',
      title: 'Blend your top themes',
      body: `Try connecting ${labels.join(' + ')} in one hook-first short.`,
      actionLabel: 'Create blended concept',
      href: createEntryHref('quick'),
    })
  }

  const niche = ctx.niche?.trim()
  if (niche) {
    suggestions.push({
      id: 'niche-angle',
      title: `${niche} angle you haven't tried`,
      body: 'Pick an underserved sub-topic from your opportunity feed this week.',
      actionLabel: 'View opportunities',
      href: '/studio/growth',
    })
  }

  const platform = ctx.platform ?? 'short-form'
  suggestions.push({
    id: 'format-reminder',
    title: `Optimize for ${platform}`,
    body: 'Your memory shows what hooks worked — reuse the structure, change the topic.',
    actionLabel: 'Open create',
    href: createEntryHref('quick'),
  })

  if (Array.isArray(ctx.learningEvents) && ctx.learningEvents.length > 0) {
    suggestions.push({
      id: 'learning-loop',
      title: 'Apply last session learnings',
      body: 'Your companion memory captured what worked — reference it before generating.',
      actionLabel: 'Memory dashboard',
      href: '/studio/knowledge',
    })
  }

  return suggestions.slice(0, 4)
}
