import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { buildDirectorTreatmentFromDirection } from '@/lib/director/director-treatment'
import {
  loadDirectorStudioSnapshot,
  upsertDirectorTreatment,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import type { StoryDirectionOption } from '@/lib/director/types'
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
    const topic = String(parsed.body!.topic || '').trim()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const project = await verifyDirectorProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, auth.user!.id)
    const direction =
      (parsed.body!.activeStoryDirection as StoryDirectionOption | undefined) ??
      snapshot?.storyDirections.activeStoryDirection ??
      null

    const treatment = buildDirectorTreatmentFromDirection(
      topic || snapshot?.storyDirections.topic || project.prompt || '',
      direction
    )

    const { error } = await upsertDirectorTreatment(projectId, auth.user!.id, treatment)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ treatment })
  } catch (err) {
    logError('director.treatment', err)
    return NextResponse.json({ error: 'Director treatment generation failed' }, { status: 500 })
  }
}
