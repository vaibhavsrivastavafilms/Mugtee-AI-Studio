import {
  loadDirectorStudioSnapshot,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { formatDirectorCreatorMemoryForPrompt } from '@/lib/director/director-context-injection'
import { getOrCreateCreatorMemory } from '@/lib/director/memory/creator-memory.server'
import { mergeProducerMemoryForPrompt } from '@/lib/director/producer/producer-memory'
import { loadCreatorProducerMemory } from '@/lib/director/producer/producer-db.server'
import { resolveDirectorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { formatIntelligenceGraphForPrompt } from '@/lib/intelligence/graph-prompt-injection'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'
import { formatVirloMarketForPrompt } from '@/lib/virlo/virlo-prompt-injection'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import type { CreativeTeamContext } from '@/lib/creative-team/types'

async function loadCreatorDna(userId: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('creator_profiles')
    .select('niche, platform, content_style, creator_dna')
    .eq('user_id', userId)
    .maybeSingle()
  const memory = data ? rowToMemoryProfile(data) : null
  return {
    niche: data?.niche ?? undefined,
    tone: data?.content_style ?? memory?.creatorDna?.voice,
    platform: data?.platform ?? undefined,
    emotionalGoal: memory?.creatorDna?.emotionalTrigger,
  }
}

/** Build creative-team context from director snapshot + memory + intelligence graph + Virlo. */
export async function resolveCreativeTeamContext(
  projectId: string,
  userId: string
): Promise<CreativeTeamContext | null> {
  const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
  if (!snapshot) return null

  const creatorDna = await loadCreatorDna(userId)
  const [creatorMemory, creatorProducerMemory, graphBundle, virloMarket] = await Promise.all([
    getOrCreateCreatorMemory(userId),
    loadCreatorProducerMemory(userId),
    resolveDirectorIntelligenceGraph(userId),
    loadVirloMarketIntelligence(creatorDna.platform ?? null),
  ])

  return {
    projectId,
    userId,
    idea: snapshot.storyDirections.topic,
    storyDirection: snapshot.storyDirections.activeStoryDirection,
    activeFramework: snapshot.projectState.activeFramework,
    frameworkAnalysis: snapshot.projectState.frameworkAnalysis,
    directorTreatment: snapshot.directorTreatment,
    blueprint: snapshot.projectState.blueprint,
    directorMemoryPrompt: formatDirectorCreatorMemoryForPrompt(creatorMemory),
    intelligenceGraphPrompt: formatIntelligenceGraphForPrompt(
      graphBundle?.graphData ?? null,
      graphBundle?.insights ?? null
    ),
    virloMarketPrompt: formatVirloMarketForPrompt(virloMarket),
    producerMemoryPrompt: mergeProducerMemoryForPrompt(null, creatorProducerMemory),
    creatorDna,
    creatorGraph: graphBundle?.graphData ?? null,
    virloMarket,
  }
}

export async function assertDirectorProject(projectId: string, userId: string) {
  return verifyDirectorProject(projectId, userId)
}
