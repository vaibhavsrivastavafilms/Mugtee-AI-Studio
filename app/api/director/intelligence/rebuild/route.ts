import { NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { rebuildCreatorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const graph = await rebuildCreatorIntelligenceGraph(auth.user!.id, {
      event: 'manual_rebuild',
    })

    return NextResponse.json({
      ok: true,
      graph: graph.graphData,
      insights: graph.insights,
      lastRebuild: graph.updatedAt,
    })
  } catch (err) {
    logError('director.intelligence.rebuild', err)
    return NextResponse.json({ error: 'Failed to rebuild creator intelligence graph' }, { status: 500 })
  }
}
