import {
  EVENT_SCORE_WEIGHTS,
  RELATIONSHIP_THRESHOLDS,
  type CreatorDna,
  type CreatorEventType,
  type LearningEvent,
  type MemoryGraph,
  type MemoryProfile,
  type RelationshipLevel,
} from '@/lib/memory/types'
import { normalizeCreatorMemory, mergeCreatorMemory } from '@/lib/companion/creator-memory'
import type { CreatorMemory } from '@/lib/companion/types'
import { scoreToRelationshipLevel, bumpRelationshipScore } from '@/lib/memory/relationship-score'

const MAX_LEARNING_EVENTS = 50

export type CreatorProfileMemoryRow = {
  creator_memory?: unknown
  creator_dna?: unknown
  relationship_level?: string | null
  relationship_score?: number | null
  memory_graph?: unknown
  learning_events?: unknown
  niche?: string | null
  platform?: string | null
  content_style?: string | null
  updated_at?: string | null
}

function str(raw: unknown, max = 120): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t ? t.slice(0, max) : undefined
}

export function normalizeCreatorDna(raw: unknown): CreatorDna {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  return {
    creatorType: str(o.creatorType ?? o.creator_type),
    audience: str(o.audience, 200),
    format: str(o.format),
    emotionalTrigger: str(o.emotionalTrigger ?? o.emotional_trigger),
    voice: str(o.voice),
    visualStyle: str(o.visualStyle ?? o.visual_style),
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  }
}

export function normalizeMemoryGraph(raw: unknown): MemoryGraph {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const nodes = Array.isArray(o.nodes)
    ? o.nodes
        .filter((n): n is Record<string, unknown> => n && typeof n === 'object')
        .map((n) => ({
          id: String(n.id ?? ''),
          type: ([
            'topic',
            'project',
            'hook',
            'theme',
            'creator',
            'brand',
            'campaign',
            'content',
            'asset',
          ].includes(String(n.type))
            ? String(n.type)
            : 'topic') as import('@/lib/memory/types').MemoryGraphNodeType,
          label: String(n.label ?? '').slice(0, 120),
          weight: typeof n.weight === 'number' ? n.weight : undefined,
        }))
        .filter((n) => n.id && n.label)
        .slice(0, 100)
    : undefined
  const edges = Array.isArray(o.edges)
    ? o.edges
        .filter((e): e is Record<string, unknown> => e && typeof e === 'object')
        .map((e) => ({
          from: String(e.from ?? ''),
          to: String(e.to ?? ''),
          relation: String(e.relation ?? 'related').slice(0, 40),
        }))
        .filter((e) => e.from && e.to)
        .slice(0, 200)
    : undefined
  return {
    nodes,
    edges,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  }
}

export function normalizeLearningEvents(raw: unknown): LearningEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, unknown> => e && typeof e === 'object')
    .map((e) => ({
      type: String(e.type ?? 'unknown').slice(0, 40),
      payload:
        e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)
          ? (e.payload as Record<string, unknown>)
          : undefined,
      at: typeof e.at === 'string' ? e.at : new Date().toISOString(),
    }))
    .slice(0, MAX_LEARNING_EVENTS)
}

export function normalizeRelationshipLevel(raw: unknown): RelationshipLevel {
  const v = typeof raw === 'string' ? raw : 'explorer'
  if (
    v === 'collaborator' ||
    v === 'partner' ||
    v === 'director' ||
    v === 'creative_soulmate'
  ) {
    return v
  }
  return 'explorer'
}

export function rowToMemoryProfile(row: CreatorProfileMemoryRow | null | undefined): MemoryProfile {
  const creatorMemory = normalizeCreatorMemory(row?.creator_memory)
  const creatorDna = normalizeCreatorDna(row?.creator_dna)
  const relationshipScore = Math.max(0, Number(row?.relationship_score ?? 0))
  const relationshipLevel =
    normalizeRelationshipLevel(row?.relationship_level) ||
    scoreToRelationshipLevel(relationshipScore)

  return {
    creatorMemory,
    creatorDna,
    relationshipLevel,
    relationshipScore,
    memoryGraph: normalizeMemoryGraph(row?.memory_graph),
    learningEvents: normalizeLearningEvents(row?.learning_events),
    preferences: {
      niche: row?.niche ?? undefined,
      platform: row?.platform ?? undefined,
      style: row?.content_style ?? undefined,
      tone: creatorMemory.preferredTone,
      length: creatorMemory.preferredDuration,
    },
    updatedAt: row?.updated_at ?? undefined,
  }
}

export function mergeLearningEvents(
  existing: LearningEvent[],
  event: LearningEvent
): LearningEvent[] {
  return [event, ...existing].slice(0, MAX_LEARNING_EVENTS)
}

export function applyEventToProfile(
  profile: MemoryProfile,
  eventType: CreatorEventType,
  payload?: Record<string, unknown>
): MemoryProfile {
  const weight = EVENT_SCORE_WEIGHTS[eventType] ?? 0
  const newScore = bumpRelationshipScore(profile.relationshipScore, weight)
  const learningEvent: LearningEvent = {
    type: eventType,
    payload,
    at: new Date().toISOString(),
  }

  let creatorMemory = profile.creatorMemory
  const patch: Partial<CreatorMemory> = {}

  if (eventType === 'hook_accept' && typeof payload?.hook === 'string') {
    patch.preferredHookStyle = 'accepted_pattern'
    patch.commonThemes = [
      payload.hook.slice(0, 80),
      ...(creatorMemory.commonThemes ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8)
  }
  if (eventType === 'export_success') {
    if (typeof payload?.theme === 'string') {
      patch.commonThemes = [
        payload.theme,
        ...(creatorMemory.commonThemes ?? []),
      ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8)
    }
    if (typeof payload?.tone === 'string') patch.preferredTone = payload.tone
  }
  if (eventType === 'feedback_negative' && typeof payload?.aspect === 'string') {
    // no direct mutation — stored in learning events
  }
  if (eventType === 'rewrite' || eventType === 'hook_regen' || eventType === 'script_regen') {
    if (typeof payload?.aspect === 'string') {
      patch.preferredHookStyle = `prefers_${payload.aspect}_iteration`
    }
  }

  if (Object.keys(patch).length) {
    creatorMemory = mergeCreatorMemory(creatorMemory, patch)
  }

  return {
    ...profile,
    creatorMemory,
    relationshipScore: newScore,
    relationshipLevel: scoreToRelationshipLevel(newScore),
    learningEvents: mergeLearningEvents(profile.learningEvents, learningEvent),
    updatedAt: new Date().toISOString(),
  }
}

export function profileToDbPatch(profile: MemoryProfile): Record<string, unknown> {
  return {
    creator_memory: profile.creatorMemory,
    creator_dna: profile.creatorDna,
    relationship_level: profile.relationshipLevel,
    relationship_score: profile.relationshipScore,
    memory_graph: profile.memoryGraph,
    learning_events: profile.learningEvents,
    updated_at: new Date().toISOString(),
  }
}

export function emptyMemoryProfile(): MemoryProfile {
  return rowToMemoryProfile(null)
}

export { RELATIONSHIP_THRESHOLDS }
