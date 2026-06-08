import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadCreativeTeamReport } from '@/lib/creative-team/creative-team-db.server'
import { assertDirectorProject } from '@/lib/creative-team/resolve-context.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await assertDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pkg = await loadCreativeTeamReport(projectId, userId)
    return NextResponse.json({ package: pkg })
  } catch (err) {
    logError('director.creative-team.get', err)
    return NextResponse.json({ error: 'Failed to load creative team report' }, { status: 500 })
  }
}
