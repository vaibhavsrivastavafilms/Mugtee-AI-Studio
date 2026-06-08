import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { getOrCreateCreatorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import {
  loadDirectorStudioSnapshot,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { enrichFrameworkRecommendations } from '@/lib/virlo/hybrid-recommendation'
import { generateFrameworkRecommendations } from '@/lib/director/framework-recommendation-engine'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    if (!snapshot) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const idea = snapshot.storyDirections.topic || project.prompt || ''
    const creatorDna = await loadCreatorDna(userId)
    const [intelligenceGraph, virloMarket] = await Promise.all([
      getOrCreateCreatorIntelligenceGraph(userId),
      loadVirloMarketIntelligence(creatorDna.platform ?? null),
    ])

    const existing = snapshot.projectState.frameworkRecommendations
    const recommendations =
      existing.length > 0
        ? enrichFrameworkRecommendations(existing, {
            creatorGraph: intelligenceGraph.graphData,
            market: virloMarket,
          })
        : await generateFrameworkRecommendations({
            idea,
            storyDirection: snapshot.storyDirections.activeStoryDirection,
            creatorDna,
            creatorGraph: intelligenceGraph.graphData,
            virloMarket,
          })

    return NextResponse.json({
      recommendations,
      market: virloMarket,
      hybrid: true,
    })
  } catch (err) {
    logError('director.virlo.recommendations', err)
    return NextResponse.json({ error: 'Hybrid recommendations failed' }, { status: 500 })
  }
}
