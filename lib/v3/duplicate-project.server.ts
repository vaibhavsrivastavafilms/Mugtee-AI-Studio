import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV3Project, insertV3Project } from '@/lib/v3/db.server'
import { runV3ProductionPhase1 } from '@/lib/v3/orchestrator.server'

export async function duplicateV3Project(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
}) {
  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  const project = await insertV3Project(params.supabase, {
    userId: params.userId,
    prompt: snapshot.project.prompt,
    title: `${snapshot.project.title} (copy)`,
  })

  const next = await runV3ProductionPhase1({
    supabase: params.supabase,
    projectId: project.id,
    userId: params.userId,
    prompt: snapshot.project.prompt,
  })

  return next
}
