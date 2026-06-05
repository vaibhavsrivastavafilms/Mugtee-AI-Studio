import type { DirectorStudioContext } from '@/lib/director/types'
import { loadDirectorStudioSnapshot } from '@/lib/director/director-db.server'
import { buildProducerSummary } from '@/lib/director/director-context-injection'
import { loadProducerReport } from '@/lib/director/producer/producer-db.server'

/** Build director studio context from DB when project is director-approved. */
export async function resolveDirectorStudioContextFromProject(
  projectId: string | undefined,
  userId: string
): Promise<DirectorStudioContext | null> {
  if (!projectId?.trim()) return null
  const snapshot = await loadDirectorStudioSnapshot(projectId.trim(), userId)
  if (!snapshot?.projectState.directorApproved) return null
  const producerApproved = snapshot.projectState.producerApproved ?? false
  const producerReport = producerApproved
    ? await loadProducerReport(projectId.trim(), userId)
    : null
  const producerSummary = buildProducerSummary(producerReport, producerApproved)
  return {
    activeStoryDirection: snapshot.storyDirections.activeStoryDirection,
    activeFramework: snapshot.projectState.activeFramework,
    frameworkAnalysis: snapshot.projectState.frameworkAnalysis,
    directorTreatment: snapshot.directorTreatment,
    storyDirectorPackage: snapshot.projectState.storyDirectorPackage,
    characterBible: snapshot.characterBible,
    cameraLanguage: snapshot.cameraLanguage,
    storyboardPlan: snapshot.projectState.storyboardPlan,
    voiceProfile: snapshot.voiceProfile,
    musicDirection: snapshot.musicDirection,
    motionPlan: snapshot.motionPlan,
    blueprint: snapshot.projectState.blueprint,
    producerSummary,
    producerApproved,
  }
}

export function parseDirectorStudioContextFromBody(
  raw: unknown
): DirectorStudioContext | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as DirectorStudioContext
}
