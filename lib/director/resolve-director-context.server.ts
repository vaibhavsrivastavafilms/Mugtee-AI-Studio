import type { DirectorStudioContext } from '@/lib/director/types'
import { loadDirectorStudioSnapshot } from '@/lib/director/director-db.server'

/** Build director studio context from DB when project is director-approved. */
export async function resolveDirectorStudioContextFromProject(
  projectId: string | undefined,
  userId: string
): Promise<DirectorStudioContext | null> {
  if (!projectId?.trim()) return null
  const snapshot = await loadDirectorStudioSnapshot(projectId.trim(), userId)
  if (!snapshot?.projectState.directorApproved) return null
  return {
    activeStoryDirection: snapshot.storyDirections.activeStoryDirection,
    directorTreatment: snapshot.directorTreatment,
    characterBible: snapshot.characterBible,
    cameraLanguage: snapshot.cameraLanguage,
    storyboardPlan: snapshot.projectState.storyboardPlan,
    voiceProfile: snapshot.voiceProfile,
    musicDirection: snapshot.musicDirection,
    motionPlan: snapshot.motionPlan,
    blueprint: snapshot.projectState.blueprint,
  }
}

export function parseDirectorStudioContextFromBody(
  raw: unknown
): DirectorStudioContext | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as DirectorStudioContext
}
