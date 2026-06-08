import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizePersistedStep } from '@/lib/cinematic/generation-state'

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type GenerationJobMetadata = {
  prompt?: string
  deviceHint?: string
  heartbeatAt?: string
  label?: string
}

export type GenerationJobRow = {
  id: string
  user_id: string
  project_id: string | null
  status: GenerationJobStatus
  progress: number
  current_step: string | null
  last_completed_step: string | null
  error: string | null
  metadata: GenerationJobMetadata
  created_at: string
  updated_at: string
}

const ACTIVE: GenerationJobStatus[] = ['queued', 'running', 'paused']

export function generationJobToPollResponse(row: GenerationJobRow) {
  return {
    jobId: row.id,
    status: row.status,
    progress: Math.round(row.progress),
    currentStep: row.current_step,
    lastCompletedStep: row.last_completed_step,
    projectId: row.project_id,
    error: row.error,
    label: row.metadata?.label?.trim() || defaultLabel(row.status, row.current_step),
    canResume: row.status === 'running' || row.status === 'paused' || row.status === 'queued',
  }
}

function defaultLabel(status: GenerationJobStatus, step: string | null): string {
  if (status === 'completed') return 'Generation complete'
  if (status === 'failed') return 'Generation failed'
  if (status === 'paused') return 'Paused — tap to continue'
  if (step) return `Generating · ${step}`
  return 'Generation in progress…'
}

export async function createGenerationJob(params: {
  id: string
  userId: string
  projectId: string | null
  currentStep?: string | null
  metadata?: GenerationJobMetadata
}): Promise<GenerationJobRow | null> {
  const supabase = createSupabaseServerClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('generation_jobs')
    .insert({
      id: params.id,
      user_id: params.userId,
      project_id: params.projectId,
      status: 'running',
      progress: 0,
      current_step: params.currentStep ?? null,
      metadata: params.metadata ?? {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    console.warn('[generation_jobs] create failed', error.message)
    return null
  }
  return data as GenerationJobRow
}

export async function updateGenerationJob(
  jobId: string,
  userId: string,
  patch: {
    status?: GenerationJobStatus
    progress?: number
    current_step?: string | null
    last_completed_step?: string | null
    error?: string | null
    metadata?: GenerationJobMetadata
  }
): Promise<GenerationJobRow | null> {
  const supabase = createSupabaseServerClient()
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status) body.status = patch.status
  if (patch.progress != null) body.progress = Math.max(0, Math.min(100, Math.round(patch.progress)))
  if (patch.current_step !== undefined) {
    const step = patch.current_step ? normalizePersistedStep(patch.current_step) : null
    body.current_step = step
  }
  if (patch.last_completed_step !== undefined) {
    const step = patch.last_completed_step
      ? normalizePersistedStep(patch.last_completed_step)
      : null
    body.last_completed_step = step
  }
  if (patch.error !== undefined) body.error = patch.error?.slice(0, 500) ?? null
  if (patch.metadata) body.metadata = patch.metadata

  const { data, error } = await supabase
    .from('generation_jobs')
    .update(body)
    .eq('id', jobId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return null
  return data as GenerationJobRow
}

export async function getGenerationJob(
  jobId: string,
  userId: string
): Promise<GenerationJobRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('generation_jobs')
    .select()
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as GenerationJobRow
}

export async function findActiveGenerationJobForProject(
  projectId: string,
  userId: string
): Promise<GenerationJobRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('generation_jobs')
    .select()
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('status', ACTIVE)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as GenerationJobRow
}
