import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildCreatorGraph } from '@/lib/intelligence/build-creator-graph'
import { generateInsights } from '@/lib/intelligence/generate-insights'
import { loadIntelligenceSources } from '@/lib/intelligence/merge-sources'
import type {
  CreatorIntelligenceGraph,
  CreatorIntelligenceGraphData,
  EvolutionEntry,
  Insight,
} from '@/lib/intelligence/types'

type GraphRow = {
  id: string
  user_id: string
  graph_data: unknown
  insights: unknown
  created_at: string
  updated_at: string
}

function parseGraphData(raw: unknown): CreatorIntelligenceGraphData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      creatorProfile: {
        identityLabel: 'Emerging Director',
        projectCount: 0,
        directorApprovedCount: 0,
        preferredFramework: null,
        preferredGenre: null,
        preferredMood: null,
        avgSceneCount: 0,
        avgDurationSec: 0,
        memoryDepth: 0,
        styleFingerprint: null,
      },
      frameworkAffinity: {} as CreatorIntelligenceGraphData['frameworkAffinity'],
      visualAffinity: {
        shotTypes: {},
        lighting: {},
        colorPalettes: {},
        composition: {},
        cameraMovements: {},
        visualStyles: {},
      },
      voiceAffinity: {
        narratorTones: {},
        pacing: {},
        intensity: {},
        narrationTypes: {},
      },
      motionAffinity: {
        motionStyles: {},
        zoomUsage: {},
        panUsage: {},
        driftUsage: {},
        pacing: {},
      },
      producerAffinity: {
        avgStoryScore: 0,
        avgAudienceScore: 0,
        avgEmotionScore: 0,
        avgRetentionScore: 0,
        avgCinematicScore: 0,
        productionReadyRate: 0,
        reportCount: 0,
        topStrengths: [],
        topSuggestions: [],
        acceptedSuggestionCount: 0,
      },
      audienceAffinity: {
        niche: null,
        platform: null,
        emotionalGoal: null,
        audience: null,
        creatorType: null,
        contentStyle: null,
      },
      evolutionHistory: [],
    }
  }
  return raw as CreatorIntelligenceGraphData
}

function parseInsights(raw: unknown): Insight[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((i) => i && typeof i === 'object') as Insight[]
}

function rowToGraph(row: GraphRow): CreatorIntelligenceGraph {
  return {
    id: row.id,
    userId: row.user_id,
    graphData: parseGraphData(row.graph_data),
    insights: parseInsights(row.insights),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getOrCreateCreatorIntelligenceGraph(
  userId: string
): Promise<CreatorIntelligenceGraph> {
  const supabase = createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('creator_intelligence_graph')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return rowToGraph(existing as GraphRow)

  const { data: created, error } = await supabase
    .from('creator_intelligence_graph')
    .insert({ user_id: userId })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create creator intelligence graph')
  }
  return rowToGraph(created as GraphRow)
}

export async function updateGraph(
  userId: string,
  graphData: CreatorIntelligenceGraphData
): Promise<CreatorIntelligenceGraph> {
  await getOrCreateCreatorIntelligenceGraph(userId)
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creator_intelligence_graph')
    .update({
      graph_data: graphData,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update creator intelligence graph')
  }
  return rowToGraph(data as GraphRow)
}

export async function updateInsights(
  userId: string,
  insights: Insight[]
): Promise<CreatorIntelligenceGraph> {
  await getOrCreateCreatorIntelligenceGraph(userId)
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creator_intelligence_graph')
    .update({
      insights,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update intelligence insights')
  }
  return rowToGraph(data as GraphRow)
}

export async function rebuildCreatorIntelligenceGraph(
  userId: string,
  opts?: { event?: EvolutionEntry['event']; projectId?: string }
): Promise<CreatorIntelligenceGraph> {
  const existing = await getOrCreateCreatorIntelligenceGraph(userId)
  const sources = await loadIntelligenceSources(userId)

  let history = existing.graphData.evolutionHistory ?? []
  if (opts?.event === 'manual_rebuild') {
    history = [
      {
        at: new Date().toISOString(),
        event: 'manual_rebuild',
        projectId: opts.projectId ?? null,
        summary: 'Intelligence graph manually rebuilt',
      },
      ...history,
    ]
  }

  const graphData = buildCreatorGraph(sources, history)
  const insights = generateInsights(graphData)

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creator_intelligence_graph')
    .update({
      graph_data: graphData,
      insights,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to rebuild creator intelligence graph')
  }
  return rowToGraph(data as GraphRow)
}

/** Load graph for prompt injection — returns null when empty. */
export async function resolveDirectorIntelligenceGraph(
  userId: string
): Promise<CreatorIntelligenceGraph | null> {
  const graph = await getOrCreateCreatorIntelligenceGraph(userId)
  const hasData =
    graph.graphData.creatorProfile.projectCount > 0 ||
    graph.graphData.producerAffinity.reportCount > 0 ||
    graph.insights.length > 0
  return hasData ? graph : null
}
