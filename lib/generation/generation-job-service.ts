import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizePersistedStep } from '@/lib/cinematic/generation-state'
import type {
  ReelPipelineFailedStage,
  ReelPipelineStageId,
  ReelPipelineStatus,
} from '@/lib/pipeline/reel-generation-orchestrator'

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
  pipelineStatus?: ReelPipelineStatus
  pipelineProgress?: number
  pipelineStage?: ReelPipelineStageId | null
  failedStage?: ReelPipelineFailedStage | null
  finalMp4Url?: string | null
  exportReady?: boolean
  /** Active reel export job — used to resume MP4 encode after refresh */
  exportJobId?: string | null
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
  pipeline_status?: ReelPipelineStatus | null
  current_stage?: ReelPipelineStageId | null
  final_mp4_url?: string | null
  failed_stage?: ReelPipelineFailedStage | null
  error_message?: string | null
  created_at: string
  updated_at: string
}

const ACTIVE: GenerationJobStatus[] = ['queued', 'running', 'paused']

export function generationJobToPollResponse(row: GenerationJobRow) {
  const meta = row.metadata ?? {}
  let pipelineStatus =
    row.pipeline_status ??
    meta.pipelineStatus ??
    mapLegacyJobToPipelineStatus(row)
  if (
    pipelineStatus === 'queued' &&
    (row.status === 'running' || row.status === 'paused') &&
    row.current_step
  ) {
    pipelineStatus = mapLegacyJobToPipelineStatus(row)
  }
  const failedStage = row.failed_stage ?? meta.failedStage ?? null
  const finalMp4Url = row.final_mp4_url ?? meta.finalMp4Url ?? null
  const errorMessage = row.error_message ?? row.error ?? null
  return {
    jobId: row.id,
    status: pipelineStatus,
    progress: meta.pipelineProgress ?? Math.round(row.progress),
    currentStep: row.current_step,
    currentStage: row.current_stage ?? meta.pipelineStage ?? null,
    lastCompletedStep: row.last_completed_step,
    projectId: row.project_id,
    error: errorMessage,
    errorMessage,
    failedStage,
    finalMp4Url,
    exportReady: pipelineStatus === 'mp4_complete' && Boolean(finalMp4Url),
    exportJobId: meta.exportJobId ?? null,
    label: meta.label?.trim() || defaultLabel(row.status, row.current_step),
    canResume:
      pipelineStatus !== 'mp4_complete' &&
      pipelineStatus !== 'failed' &&
      (row.status === 'running' || row.status === 'paused' || row.status === 'queued'),
    /** Legacy generation_jobs row status */
    legacyStatus: row.status,
  }
}

function mapLegacyJobToPipelineStatus(row: GenerationJobRow): ReelPipelineStatus {
  if (row.status === 'failed') return 'failed'
  if (row.status === 'completed') return 'mp4_complete'
  if (row.current_step === 'render') return 'mp4_rendering'
  if (row.current_step === 'voice') return 'voice_generating'
  if (row.current_step === 'images' || row.current_step === 'storyboard') return 'images_generating'
  if (row.current_step === 'script' || row.current_step === 'scenes') return 'script_generating'
  if (row.status === 'running' || row.status === 'paused') return 'script_generating'
  if (row.status === 'queued' && row.current_step) return 'script_generating'
  return row.status === 'queued' ? 'queued' : 'script_generating'
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
  if (patch.error !== undefined) {
    body.error = patch.error?.slice(0, 500) ?? null
    body.error_message = patch.error?.slice(0, 500) ?? null
  }
  if (patch.metadata) {
    body.metadata = patch.metadata
    if (patch.metadata.pipelineStatus) {
      body.pipeline_status = patch.metadata.pipelineStatus
    }
    if (patch.metadata.pipelineStage !== undefined) {
      body.current_stage = patch.metadata.pipelineStage
    }
    if (patch.metadata.finalMp4Url !== undefined) {
      body.final_mp4_url = patch.metadata.finalMp4Url
    }
    if (patch.metadata.failedStage !== undefined) {
      body.failed_stage = patch.metadata.failedStage
    }
    if (patch.metadata.pipelineProgress != null) {
      body.progress = Math.max(0, Math.min(100, Math.round(patch.metadata.pipelineProgress)))
    }
    if (patch.metadata.pipelineStatus === 'mp4_complete' && patch.metadata.finalMp4Url) {
      body.status = 'completed'
    }
    if (patch.metadata.pipelineStatus === 'failed') {
      body.status = 'failed'
    }
  }

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

export async function listGenerationJobsForUser(
  userId: string,
  limit = 20
): Promise<GenerationJobRow[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('generation_jobs')
    .select()
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as GenerationJobRow[]
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

/** Cancel other in-flight jobs so a new pipeline run has a single active row. */
export async function cancelActiveGenerationJobsForProject(
  projectId: string,
  userId: string,
  exceptJobId?: string | null
): Promise<void> {
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('generation_jobs')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('status', ACTIVE)

  if (exceptJobId) {
    query = query.neq('id', exceptJobId)
  }

  const { error } = await query
  if (error) {
    console.warn('[generation_jobs] cancel active failed', error.message)
  }
}
