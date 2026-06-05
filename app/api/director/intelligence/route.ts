import { NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { getOrCreateCreatorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const graph = await getOrCreateCreatorIntelligenceGraph(auth.user!.id)

    return NextResponse.json({
      graph: graph.graphData,
      insights: graph.insights,
      graphLoaded: true,
      lastRebuild: graph.updatedAt,
    })
  } catch (err) {
    logError('director.intelligence.get', err)
    return NextResponse.json({ error: 'Failed to load creator intelligence graph' }, { status: 500 })
  }
}
