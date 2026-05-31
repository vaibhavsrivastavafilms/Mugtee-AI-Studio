import type { CreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { CREATOR_PLATFORMS, CREATOR_CONTENT_STYLES } from '@/lib/creator/creator-memory'

export type TodaysBrief = {
  greeting: string
  goalLine: string
  nicheLine: string
  recommendedTopic: string
  recommendedHook: string
  contentType: string
  nextMilestone: string
}

const TOPIC_BY_NICHE: Record<string, { topic: string; hook: string; type: string }> = {
  child_psychology: {
    topic: 'Why kids lie — and what it really means',
    hook: 'Your child isn\'t manipulating you. They\'re protecting something fragile.',
    type: 'Educational reel · 60s',
  },
  finance: {
    topic: 'The one money habit that compounds quietly',
    hook: 'Most people optimize income. Winners optimize leakage.',
    type: 'Authority reel · 45s',
  },
  documentary: {
    topic: 'A forgotten moment that changed everything',
    hook: 'History remembers the headline. This is the scene before it.',
    type: 'Documentary short · 60s',
  },
  technology: {
    topic: 'What AI actually replaces — and what it never will',
    hook: 'Everyone asks if AI takes jobs. Wrong question.',
    type: 'Explainer reel · 60s',
  },
  fitness: {
    topic: 'The discipline gap nobody talks about',
    hook: 'You don\'t lack motivation. You lack a system on bad days.',
    type: 'Motivational reel · 30s',
  },
  general: {
    topic: 'A story your audience will feel in the first frame',
    hook: 'Stop explaining. Start with the moment everything changed.',
    type: 'Cinematic reel · 60s',
  },
}

const GOAL_LABELS: Record<string, string> = {
  grow: 'Grow audience',
  monetize: 'Monetize',
  authority: 'Build authority',
  consistency: 'Stay consistent',
  learn: 'Learn the pipeline',
}

const GOAL_MILESTONES: Record<string, string> = {
  grow: 'Publish 3 reels this week',
  monetize: 'Ship one reel with a clear CTA',
  authority: 'Deep-dive script → storyboard → voice',
  consistency: 'Complete one Quick Cut today',
  learn: 'Finish your first full pipeline export',
}

function labelPlatform(id?: string): string {
  if (!id) return 'your platform'
  return CREATOR_PLATFORMS.find((p) => p.id === id)?.label ?? id
}

function labelStyle(id?: string): string {
  if (!id) return 'cinematic'
  return CREATOR_CONTENT_STYLES.find((s) => s.id === id)?.label ?? id
}

export function buildTodaysBrief(profile: CreatorMemoryProfile, name?: string | null): TodaysBrief {
  const nicheKey = profile.niche?.trim() || 'general'
  const nichePack = TOPIC_BY_NICHE[nicheKey] ?? TOPIC_BY_NICHE.general
  const displayName = profile.creatorName?.trim() || name?.trim() || 'Creator'
  const goal = profile.creatorGoal?.trim() || 'consistency'
  const milestone = GOAL_MILESTONES[goal] ?? GOAL_MILESTONES.consistency

  return {
    greeting: `Good session, ${displayName}. Here's what I'd focus on today.`,
    goalLine: profile.creatorGoal
      ? `Goal: ${GOAL_LABELS[profile.creatorGoal] ?? profile.creatorGoal.replace(/_/g, ' ')}`
      : 'Goal: build a consistent publishing rhythm',
    nicheLine: profile.niche
      ? `Niche: ${nicheKey.replace(/_/g, ' ')} · ${labelPlatform(profile.primaryPlatform)}`
      : `Platform: ${labelPlatform(profile.primaryPlatform)} · ${labelStyle(profile.contentStyle)} style`,
    recommendedTopic: nichePack.topic,
    recommendedHook: nichePack.hook,
    contentType: nichePack.type,
    nextMilestone: milestone,
  }
}
