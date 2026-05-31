import type { CreatorAgentContext, WeeklyContentPlan, WeeklyPlanSlot } from '@/lib/agent/types'
import { generateOpportunities } from '@/lib/agent/opportunity-radar'
import { hashSeed, weekStartDate } from '@/lib/agent/agent-context'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function slotId(format: string, index: number): string {
  return `${format}-${index}`
}

function buildSlot(
  format: WeeklyPlanSlot['format'],
  index: number,
  topic: string,
  title: string,
  day?: string,
  rationale?: string
): WeeklyPlanSlot {
  return {
    id: slotId(format, index),
    format,
    title,
    topic,
    hookPreview: `What if ${topic.split(' ').slice(0, 4).join(' ')}…`,
    day,
    rationale,
  }
}

export function buildWeeklyContentPlan(
  ctx: CreatorAgentContext,
  weekStart?: string
): WeeklyContentPlan {
  const start = weekStart ?? weekStartDate()
  const opportunities = generateOpportunities(ctx, start, 13)
  const topTopics = opportunities.map((o) => o.topic ?? o.title)

  const slots: WeeklyPlanSlot[] = []
  let dayIdx = 0

  for (let i = 0; i < 7; i++) {
    const topic = topTopics[i % topTopics.length] ?? 'your signature theme'
    slots.push(
      buildSlot(
        'short',
        i,
        topic,
        `Short #${i + 1}: ${topic}`,
        DAYS[dayIdx % 7],
        'Daily touchpoint — quick hook, one insight.'
      )
    )
    dayIdx++
  }

  for (let i = 0; i < 3; i++) {
    const topic = topTopics[(7 + i) % topTopics.length] ?? 'audience favorite'
    slots.push(
      buildSlot('reel', i, topic, `Reel: ${topic}`, undefined, 'Primary growth format this week.')
    )
  }

  for (let i = 0; i < 2; i++) {
    const topic = topTopics[(10 + i) % topTopics.length] ?? 'deep dive'
    slots.push(
      buildSlot(
        'long_form',
        i,
        topic,
        `Long-form: ${topic}`,
        undefined,
        'Authority builder — expand your best-performing angle.'
      )
    )
  }

  const expTopic =
    topTopics[hashSeed(`${ctx.userId}-${start}-exp`) % Math.max(topTopics.length, 1)] ??
    'format experiment'
  slots.push(
    buildSlot(
      'experimental',
      0,
      expTopic,
      `Experimental: ${expTopic}`,
      'Sun',
      'Test a new format or hook style — low risk, high learning.'
    )
  )

  const niche = ctx.niche ?? 'your niche'
  return {
    weekStart: start,
    summary: `This week: 7 Shorts, 3 Reels, 2 long-form pieces, 1 experiment — all aligned to ${niche} and your recent patterns.`,
    slots,
  }
}
