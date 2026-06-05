import { createSupabaseServerClient } from '@/lib/supabase/server'
import { learnFromDirectorProject } from '@/lib/director/memory/project-analysis-engine'

/** Returns true when project has completed director approval workflow. */
export async function isDirectorApprovedProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('director_project_state')
    .select('director_approved')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data?.director_approved)
}

/**
 * Fire-and-forget director memory learning after export or generation complete.
 * No-op for non-director projects (Quick Mode safe).
 */
export async function triggerDirectorMemoryLearning(
  userId: string,
  projectId: string | undefined | null
): Promise<void> {
  const id = projectId?.trim()
  if (!id) return

  try {
    const approved = await isDirectorApprovedProject(id, userId)
    if (!approved) return
    await learnFromDirectorProject(id, userId)
  } catch (err) {
    console.error('[director-memory] learning failed', err)
  }
}
