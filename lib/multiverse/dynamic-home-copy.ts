import { getCreatorWorld } from '@/lib/multiverse/creator-worlds'
import { hqTierFromXp } from '@/lib/multiverse/hq-evolution'
import { reputationRankLabel } from '@/lib/multiverse/reputation-system'
import { sidekickTierInfo } from '@/lib/multiverse/sidekick-evolution'
import type { CreatorReputation, CreatorWorldId, SidekickPersonality } from '@/lib/multiverse/types'
import { nextTeamUnlock } from '@/lib/multiverse/ai-team-unlock'

export type HomeBriefingInput = {
  creatorName?: string | null
  firstName?: string | null
  creatorWorld: CreatorWorldId | null
  creatorXp: number
  creatorLevel: number
  reputation: CreatorReputation
  sidekickPersonality: SidekickPersonality
  sidekickTier: number
  streakCount?: number
  recentProjectTitle?: string | null
  projectsCount?: number
}

export type HomeBriefing = {
  headline: string
  subline: string
  ctaLabel: string
  ctaTopic?: string
  hqTitle: string
  sidekickTitle: string
  worldLabel: string | null
  reputationLabel: string
  nextUnlock: string | null
}

export function buildDynamicHomeBriefing(input: HomeBriefingInput): HomeBriefing {
  const name = input.firstName?.trim() || input.creatorName?.trim() || 'Creator'
  const world = getCreatorWorld(input.creatorWorld)
  const hq = hqTierFromXp(input.creatorXp)
  const sidekick = sidekickTierInfo(input.sidekickTier)
  const nextUnlock = nextTeamUnlock(input.creatorLevel)

  let headline: string
  let subline: string
  let ctaLabel = 'Start creating'
  let ctaTopic: string | undefined

  if (input.recentProjectTitle) {
    headline = `${name}, your ${world?.label ?? 'studio'} awaits.`
    subline = `Last time you worked on "${input.recentProjectTitle.slice(0, 60)}" — ready to push it further or start something new?`
    ctaLabel = 'Continue creating'
  } else if (input.streakCount && input.streakCount >= 3) {
    headline = `${input.streakCount}-day streak, ${name}. The multiverse remembers.`
    subline = `Your ${hq.title} is evolving. ${sidekick.title} has new ideas for ${world?.label ?? 'your next reel'}.`
    ctaLabel = 'Keep the streak'
  } else if (!input.creatorWorld) {
    headline = `Welcome to your creator multiverse, ${name}.`
    subline = 'Choose your world — documentary, cinema, business, and more — and Mugtee will shape every generation around it.'
    ctaLabel = 'Choose your world'
  } else if ((input.projectsCount ?? 0) === 0) {
    headline = `${world!.label} world unlocked, ${name}.`
    subline = `${world!.tagline} Your HQ starts as a ${hq.title.toLowerCase()} — every project upgrades it.`
    ctaLabel = 'Create first project'
    ctaTopic = world!.starterMissions[0]
  } else {
    headline = `Good to see you back, ${name}.`
    subline = `${sidekick.title} is synced to your ${world?.label ?? 'creative'} style. ${hq.description}`
    ctaLabel = 'Ask Mugtee'
    ctaTopic = world?.starterMissions[0]
  }

  return {
    headline,
    subline,
    ctaLabel,
    ctaTopic,
    hqTitle: hq.title,
    sidekickTitle: sidekick.title,
    worldLabel: world?.label ?? null,
    reputationLabel: reputationRankLabel(input.reputation.rank),
    nextUnlock: nextUnlock ? `${nextUnlock.label} unlocks at Lv ${nextUnlock.unlockLevel}` : null,
  }
}
