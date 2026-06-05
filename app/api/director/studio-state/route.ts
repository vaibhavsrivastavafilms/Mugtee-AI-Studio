import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  loadDirectorStudioSnapshot,
  upsertCameraProfile,
  upsertCharacterBible,
  upsertDirectorProjectState,
  upsertDirectorTreatment,
  upsertMotionPlan,
  upsertMusicProfile,
  upsertStoryDirections,
  upsertVoiceProfile,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { normalizeDirectorTreatment } from '@/lib/director/director-treatment'
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

    const snapshot = await loadDirectorStudioSnapshot(projectId, auth.user!.id)
    if (!snapshot) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(snapshot)
  } catch (err) {
    logError('director.studio-state.get', err)
    return NextResponse.json({ error: 'Failed to load director studio state' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const project = await verifyDirectorProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const userId = auth.user!.id
    const body = parsed.body!

    if (body.storyDirections) {
      const sd = body.storyDirections as Record<string, unknown>
      await upsertStoryDirections(projectId, userId, {
        topic: typeof sd.topic === 'string' ? sd.topic : undefined,
        options: Array.isArray(sd.options) ? sd.options : undefined,
        selectedId: typeof sd.selectedId === 'string' ? sd.selectedId : sd.selectedId === null ? null : undefined,
        activeStoryDirection:
          sd.activeStoryDirection !== undefined
            ? (sd.activeStoryDirection as import('@/lib/director/types').StoryDirectionOption | null)
            : undefined,
      })
    }

    if (body.directorTreatment) {
      await upsertDirectorTreatment(
        projectId,
        userId,
        normalizeDirectorTreatment(body.directorTreatment)
      )
    }

    if (body.characterBible) {
      await upsertCharacterBible(
        projectId,
        userId,
        body.characterBible as import('@/lib/director/types').CharacterBible
      )
    }

    if (body.cameraLanguage) {
      await upsertCameraProfile(
        projectId,
        userId,
        body.cameraLanguage as import('@/lib/director/types').CameraLanguagePlan
      )
    }

    if (body.voiceProfile) {
      await upsertVoiceProfile(
        projectId,
        userId,
        body.voiceProfile as import('@/lib/director/types').VoiceProfile
      )
    }

    if (body.musicDirection) {
      await upsertMusicProfile(
        projectId,
        userId,
        body.musicDirection as import('@/lib/director/types').MusicDirection
      )
    }

    if (body.motionPlan) {
      await upsertMotionPlan(
        projectId,
        userId,
        body.motionPlan as import('@/lib/director/types').MotionPlan
      )
    }

    if (body.projectState) {
      const ps = body.projectState as Record<string, unknown>
      await upsertDirectorProjectState(projectId, userId, {
        directorApproved: typeof ps.directorApproved === 'boolean' ? ps.directorApproved : undefined,
        blueprintLocked: typeof ps.blueprintLocked === 'boolean' ? ps.blueprintLocked : undefined,
        stageProgress:
          ps.stageProgress && typeof ps.stageProgress === 'object'
            ? (ps.stageProgress as import('@/lib/director/types').DirectorStageProgress)
            : undefined,
        blueprint:
          ps.blueprint !== undefined
            ? (ps.blueprint as import('@/lib/director/types').DirectorBlueprint | null)
            : undefined,
        storyboardPlan:
          ps.storyboardPlan !== undefined
            ? (ps.storyboardPlan as import('@/lib/director/types').StoryboardPlan | null)
            : undefined,
        storyDirectorPackage:
          ps.storyDirectorPackage !== undefined
            ? (ps.storyDirectorPackage as import('@/lib/ai/director/story-director-engine').StoryDirectorPackage | null)
            : undefined,
      })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    return NextResponse.json(snapshot)
  } catch (err) {
    logError('director.studio-state.patch', err)
    return NextResponse.json({ error: 'Failed to save director studio state' }, { status: 500 })
  }
}
