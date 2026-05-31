import { hqLevelFromXp } from '@/lib/multiverse/hq-evolution'
import { sidekickTierFromLevel } from '@/lib/multiverse/sidekick-evolution'
import { computeReputation } from '@/lib/multiverse/reputation-system'
import { buildHallOfFame } from '@/lib/multiverse/hall-of-fame'
import {
  DEFAULT_MULTIVERSE_PROFILE,
  DEFAULT_REPUTATION,
  DEFAULT_SIDEKICK_PERSONALITY,
  type CreatorReputation,
  type CreatorWorldId,
  type HallOfFameCache,
  type LegendaryProjectRef,
  type MultiverseProfile,
  type SidekickPersonality,
  type StoryVaultEntry,
} from '@/lib/multiverse/types'
import { rowToMissionProfile, type MissionRow } from '@/lib/mission/mission-server'
import type { MissionStreak, MissionStats } from '@/lib/mission/mission-types'

export type MultiverseRow = MissionRow & {
  creator_world?: string | null
  creator_reputation?: CreatorReputation | null
  creator_hq_level?: number | null
  sidekick_personality?: SidekickPersonality | null
  sidekick_evolution_tier?: number | null
  legendary_projects?: LegendaryProjectRef[] | null
  story_vault_entries?: StoryVaultEntry[] | null
  hall_of_fame?: HallOfFameCache | null
  relationship_score?: number | null
  learning_events?: unknown[] | null
}

const VALID_WORLDS: CreatorWorldId[] = [
  'documentary',
  'cinema',
  'business',
  'history',
  'luxury',
  'education',
  'motivation',
]

function parseWorld(raw: unknown): CreatorWorldId | null {
  if (typeof raw !== 'string') return null
  return VALID_WORLDS.includes(raw as CreatorWorldId) ? (raw as CreatorWorldId) : null
}

function parseReputation(raw: unknown): CreatorReputation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_REPUTATION }
  const o = raw as Record<string, unknown>
  return {
    consistency: typeof o.consistency === 'number' ? o.consistency : 0,
    quality: typeof o.quality === 'number' ? o.quality : 0,
    publishing: typeof o.publishing === 'number' ? o.publishing : 0,
    engagement: typeof o.engagement === 'number' ? o.engagement : 0,
    learning: typeof o.learning === 'number' ? o.learning : 0,
    rank:
      typeof o.rank === 'string' ?
        (o.rank as CreatorReputation['rank'])
      : 'beginner',
  }
}

function parsePersonality(raw: unknown): SidekickPersonality {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SIDEKICK_PERSONALITY }
  }
  const o = raw as Record<string, unknown>
  return {
    preset: (typeof o.preset === 'string' ? o.preset : DEFAULT_SIDEKICK_PERSONALITY.preset) as SidekickPersonality['preset'],
    voice: typeof o.voice === 'string' ? o.voice : DEFAULT_SIDEKICK_PERSONALITY.voice,
    humour: typeof o.humour === 'string' ? o.humour : DEFAULT_SIDEKICK_PERSONALITY.humour,
    relationshipStyle:
      typeof o.relationshipStyle === 'string' ?
        o.relationshipStyle
      : DEFAULT_SIDEKICK_PERSONALITY.relationshipStyle,
  }
}

function parseLegendary(raw: unknown): LegendaryProjectRef[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (p): p is LegendaryProjectRef =>
      p &&
      typeof p === 'object' &&
      typeof (p as LegendaryProjectRef).projectId === 'string'
  )
}

function parseVault(raw: unknown): StoryVaultEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is StoryVaultEntry =>
      e && typeof e === 'object' && typeof (e as StoryVaultEntry).id === 'string'
  )
}

function parseHallOfFame(raw: unknown): HallOfFameCache {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as HallOfFameCache
}

export function rowToMultiverseProfile(row: MultiverseRow | null): MultiverseProfile {
  if (!row) return { ...DEFAULT_MULTIVERSE_PROFILE }

  const mission = rowToMissionProfile(row)
  const xp = mission.creator_xp
  const level = mission.creator_level

  const computedReputation = computeReputation({
    stats: mission.stats,
    streak: mission.mission_streak,
    relationshipScore: row.relationship_score ?? 0,
    learningEventCount: Array.isArray(row.learning_events) ? row.learning_events.length : 0,
  })

  const storedRep = parseReputation(row.creator_reputation)
  const reputation =
    storedRep.consistency > 0 || storedRep.rank !== 'beginner' ? storedRep : computedReputation

  return {
    creatorWorld: parseWorld(row.creator_world),
    creatorReputation: reputation,
    creatorHqLevel: row.creator_hq_level ?? hqLevelFromXp(xp),
    sidekickPersonality: parsePersonality(row.sidekick_personality),
    sidekickEvolutionTier: row.sidekick_evolution_tier ?? sidekickTierFromLevel(level),
    legendaryProjects: parseLegendary(row.legendary_projects),
    storyVaultEntries: parseVault(row.story_vault_entries),
    hallOfFame: parseHallOfFame(row.hall_of_fame),
    creatorXp: xp,
    creatorLevel: level,
  }
}

export function syncDerivedMultiverseFields(
  profile: MultiverseProfile,
  missionStats: MissionStats,
  streak: MissionStreak,
  relationshipScore = 0,
  learningEventCount = 0
): MultiverseProfile {
  const reputation = computeReputation({
    stats: missionStats,
    streak,
    relationshipScore,
    learningEventCount,
  })
  const hallOfFame = buildHallOfFame({
    stats: missionStats,
    streak,
    achievements: [],
  })

  return {
    ...profile,
    creatorHqLevel: hqLevelFromXp(profile.creatorXp),
    sidekickEvolutionTier: sidekickTierFromLevel(profile.creatorLevel),
    creatorReputation: reputation,
    hallOfFame: { ...profile.hallOfFame, ...hallOfFame },
  }
}

export function multiverseProfileToRow(profile: MultiverseProfile): Record<string, unknown> {
  return {
    creator_world: profile.creatorWorld,
    creator_reputation: profile.creatorReputation,
    creator_hq_level: profile.creatorHqLevel,
    sidekick_personality: profile.sidekickPersonality,
    sidekick_evolution_tier: profile.sidekickEvolutionTier,
    legendary_projects: profile.legendaryProjects,
    story_vault_entries: profile.storyVaultEntries,
    hall_of_fame: profile.hallOfFame,
  }
}

export const MULTIVERSE_COLUMNS =
  'creator_world, creator_reputation, creator_hq_level, sidekick_personality, sidekick_evolution_tier, legendary_projects, story_vault_entries, hall_of_fame, creator_xp, creator_level, mission_streak, mission_stats, relationship_score, learning_events'
