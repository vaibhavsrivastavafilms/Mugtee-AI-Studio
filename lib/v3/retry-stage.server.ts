import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV3Project, upsertV3Job } from '@/lib/v3/db.server'
import { advanceV3Production } from '@/lib/v3/orchestrator.server'
import type { V3AgentId } from '@/types/v3/production'

const RETRYABLE_AGENTS: V3AgentId[] = [
  'research',
  'script',
  'storyboard',
  'character',
  'location',
  'style',
  'prompts',
  'image',
  'video',
  'voice',
  'music',
  'captions',
  'editor',
  'export',
]

export async function retryV3FailedStage(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
  agent?: V3AgentId
}) {
  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  const failedJobs = snapshot.jobs.filter((job) => job.status === 'failed')
  const target =
    (params.agent ? failedJobs.find((job) => job.agent === params.agent) : failedJobs[0]) ??
    null

  if (!target) throw new Error('No failed stage to retry')
  if (!RETRYABLE_AGENTS.includes(target.agent)) {
    throw new Error(`Stage ${target.agent} cannot be retried`)
  }

  await upsertV3Job(params.supabase, {
    projectId: params.projectId,
    agent: target.agent,
    status: 'queued',
    input: target.input ?? {},
    error: null,
  })

  return advanceV3Production({
    supabase: params.supabase,
    projectId: params.projectId,
    userId: params.userId,
  })
}
