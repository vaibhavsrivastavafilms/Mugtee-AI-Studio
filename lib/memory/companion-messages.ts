import type { MemoryProfile } from '@/lib/memory/types'
import { relationshipLabel } from '@/lib/memory/relationship-score'
import { recentActivitySummary } from '@/lib/memory/creator-timeline'
import { topNodesByType } from '@/lib/memory/knowledge-graph'

export type CompanionMessageContext = {
  firstName?: string | null
  returning?: boolean
}

const GREETINGS = [
  'Welcome back',
  'Good to see you',
  'Ready when you are',
]

/** Smart contextual messages from memory */
export function buildCompanionMessage(
  profile: MemoryProfile,
  ctx: CompanionMessageContext = {}
): { greeting: string; insight: string; badge?: string } {
  const name = ctx.firstName?.trim()
  const greetingBase = ctx.returning ? GREETINGS[0] : GREETINGS[2]
  const greeting = name ? `${greetingBase}, ${name}.` : `${greetingBase}.`

  const activity = recentActivitySummary(profile)
  if (activity) {
    return {
      greeting,
      insight: activity,
      badge: relationshipLabel(profile.relationshipLevel),
    }
  }

  const hooks = topNodesByType(profile.memoryGraph, 'hook', 1)
  if (hooks.length) {
    return {
      greeting,
      insight: `Your audience responds to hooks like "${hooks[0].label.slice(0, 50)}…" — let's build on that.`,
      badge: relationshipLabel(profile.relationshipLevel),
    }
  }

  const tone = profile.creatorMemory.preferredTone
  if (tone) {
    return {
      greeting,
      insight: `I'll keep your ${tone.replace(/_/g, ' ')} tone front and center today.`,
      badge: relationshipLabel(profile.relationshipLevel),
    }
  }

  const themes = profile.creatorMemory.commonThemes
  if (themes?.length) {
    return {
      greeting,
      insight: `Your recurring themes — ${themes.slice(0, 2).join(', ')} — are shaping every generation.`,
      badge: relationshipLabel(profile.relationshipLevel),
    }
  }

  return {
    greeting,
    insight: 'Tell me what you want to create — I remember your style as we go.',
    badge: relationshipLabel(profile.relationshipLevel),
  }
}

export function dashboardInsights(profile: MemoryProfile): {
  audienceInsight: string
  growthTrend: string
  topFormats: string[]
} {
  const dna = profile.creatorDna
  const audienceInsight = dna.audience
    ? `Your core audience: ${dna.audience.slice(0, 120)}`
    : dna.emotionalTrigger
      ? `Your audience responds to ${dna.emotionalTrigger} stories`
      : 'Complete a few projects — Mugtee will learn your audience patterns.'

  const recentCount = profile.learningEvents.filter((e) => {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000
    return new Date(e.at).getTime() >= week
  }).length

  const growthTrend =
    recentCount >= 10
      ? 'High activity — relationship deepening fast'
      : recentCount >= 3
        ? 'Steady growth — keep creating'
        : 'Early stage — every project teaches Mugtee more'

  const topFormats = [
    dna.format,
    profile.preferences.platform,
    profile.creatorMemory.preferredHookStyle,
  ].filter((v): v is string => Boolean(v))

  return { audienceInsight, growthTrend, topFormats }
}
