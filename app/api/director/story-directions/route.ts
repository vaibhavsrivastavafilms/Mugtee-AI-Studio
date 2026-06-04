import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { generateStoryDirections } from '@/lib/director/story-direction-engine'
import {
  loadDirectorStudioSnapshot,
  upsertStoryDirections,
  usedAngleIdsFromOptions,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
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
    const topic = String(parsed.body!.topic || parsed.body!.prompt || '').trim()
    const rawSeed = parsed.body!.sessionSeed
    const sessionSeed =
      typeof rawSeed === 'string' || typeof rawSeed === 'number' ? rawSeed : undefined

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const project = await verifyDirectorProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const existing = await loadDirectorStudioSnapshot(projectId, auth.user!.id)
    const used = existing ? usedAngleIdsFromOptions(existing.storyDirections.options) : []
    const options = generateStoryDirections(topic, { usedAngleIds: used, sessionSeed })

    const { error } = await upsertStoryDirections(projectId, auth.user!.id, {
      topic,
      options,
      selectedId: null,
      activeStoryDirection: null,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ options, topic })
  } catch (err) {
    logError('director.story-directions', err)
    return NextResponse.json({ error: 'Story direction generation failed' }, { status: 500 })
  }
}
