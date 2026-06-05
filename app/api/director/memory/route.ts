import { NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { getOrCreateCreatorMemory } from '@/lib/director/memory/creator-memory.server'
import { computeMemoryScores } from '@/lib/director/memory/memory-score'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const profile = await getOrCreateCreatorMemory(auth.user!.id)
    const scores = computeMemoryScores(profile)

    return NextResponse.json({
      memory: profile,
      scores,
      memoryLoaded: true,
    })
  } catch (err) {
    logError('director.memory.get', err)
    return NextResponse.json({ error: 'Failed to load director memory' }, { status: 500 })
  }
}
