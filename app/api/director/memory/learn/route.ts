import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { learnFromDirectorProject } from '@/lib/director/memory/project-analysis-engine'
import { computeMemoryScores } from '@/lib/director/memory/memory-score'
import { verifyDirectorProject } from '@/lib/director/director-db.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await learnFromDirectorProject(projectId, userId)
    if (!result) {
      return NextResponse.json(
        { error: 'Project not eligible for director memory learning (not director-approved)' },
        { status: 422 }
      )
    }

    const scores = computeMemoryScores(result.profile)

    return NextResponse.json({
      ok: true,
      memory: result.profile,
      scores,
      analysis: result.analysis,
      lastLearningRun: new Date().toISOString(),
    })
  } catch (err) {
    logError('director.memory.learn', err)
    return NextResponse.json({ error: 'Director memory learning failed' }, { status: 500 })
  }
}
