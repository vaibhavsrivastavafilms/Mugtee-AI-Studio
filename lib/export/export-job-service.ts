import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ReelExportStatus } from '@/lib/reels/export-api'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'

export type ExportJobStatus =
  | 'pending'
  | 'queued'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ExportJobMetadata = {
  label?: string
  stage?: string
  jobType?: 'reel-mp4' | 'timeline' | 'faceless' | 'direct-render'
  storagePath?: string
  storageBucket?: string
  includeVoiceover?: boolean
  includeCaptions?: boolean
  heartbeatAt?: string
  quality?: string
}

export type ExportJobRow = {
  id: string
  user_id: string
  project_id: string | null
  status: ExportJobStatus
  progress: number
  render_url: string | null
  error: string | null
  metadata: ExportJobMetadata
  created_at: string
  updated_at: string
}

const ACTIVE_STATUSES: ExportJobStatus[] = [
  'pending',
  'queued',
  'rendering',
  'uploading',
]

function mapRowStatusToReelExport(status: ExportJobStatus): ReelExportStatus {
  if (status === 'cancelled') return 'failed'
  return status as ReelExportStatus
}

export function exportJobToPollResponse(row: ExportJobRow) {
  const meta = row.metadata ?? {}
  let status = mapRowStatusToReelExport(row.status)
  const reelUrl =
    status === 'completed' && row.render_url?.trim() && isValidReelDownloadUrl(row.render_url)
      ? row.render_url.trim()
      : null
  if (status === 'completed' && !reelUrl) {
    status = row.status === 'uploading' ? 'uploading' : 'rendering'
  }
  return {
    jobId: row.id,
    status,
    progress: Math.round(row.progress),
    label: meta.label?.trim() || defaultLabelForStatus(status),
    reelUrl,
    error: row.error,
    storagePath: meta.storagePath ?? null,
    storageBucket: meta.storageBucket ?? null,
  }
}

function defaultLabelForStatus(status: ReelExportStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued…'
    case 'rendering':
      return 'Encoding reel…'
    case 'uploading':
      return 'Uploading…'
    case 'completed':
      return 'Download ready'
    case 'failed':
      return 'Export failed'
    default:
      return 'Preparing export…'
  }
}

export async function createExportJob(params: {
  id: string
  userId: string
  projectId: string | null
  metadata?: ExportJobMetadata
}): Promise<ExportJobRow | null> {
  const supabase = createSupabaseServerClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('export_jobs')
    .insert({
      id: params.id,
      user_id: params.userId,
      project_id: params.projectId,
      status: 'queued',
      progress: 0,
      metadata: params.metadata ?? { jobType: 'reel-mp4' },
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[export_jobs] create failed', error.message)
    return null
  }
  return data as ExportJobRow
}

export async function getExportJob(
  jobId: string,
  userId?: string
): Promise<ExportJobRow | null> {
  const supabase = createSupabaseServerClient()
  let query = supabase.from('export_jobs').select('*').eq('id', jobId)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data as ExportJobRow
}

export async function updateExportJob(
  jobId: string,
  patch: Partial<{
    status: ExportJobStatus
    progress: number
    render_url: string | null
    error: string | null
    metadata: ExportJobMetadata
  }>
): Promise<ExportJobRow | null> {
  const supabase = createSupabaseServerClient()
  const existing = await getExportJob(jobId)
  if (!existing) return null

  const mergedMeta: ExportJobMetadata = {
    ...(existing.metadata ?? {}),
    ...(patch.metadata ?? {}),
    heartbeatAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('export_jobs')
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.render_url !== undefined ? { render_url: patch.render_url } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      metadata: mergedMeta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .single()

  if (error) {
    console.error('[export_jobs] update failed', error.message)
    return null
  }
  return data as ExportJobRow
}

export async function findActiveExportJobForProject(
  projectId: string,
  userId: string
): Promise<ExportJobRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as ExportJobRow
}

/** Enqueue: persist job row (worker dequeue is future external process). */
export async function enqueueExportJob(params: {
  id: string
  userId: string
  projectId: string
  metadata?: ExportJobMetadata
}): Promise<ExportJobRow | null> {
  return createExportJob({
    id: params.id,
    userId: params.userId,
    projectId: params.projectId,
    metadata: { jobType: 'reel-mp4', ...params.metadata },
  })
}

/** Stub: external worker would claim next queued job. */
export async function dequeueExportJob(): Promise<ExportJobRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as ExportJobRow
}

/** Stub: mark cancelled; does not stop in-flight Vercel render. */
export async function cancelExportJob(jobId: string, userId: string): Promise<boolean> {
  const row = await getExportJob(jobId, userId)
  if (!row || !ACTIVE_STATUSES.includes(row.status)) return false
  await updateExportJob(jobId, { status: 'cancelled', error: 'Cancelled by user' })
  return true
}

/** Stub: re-queue failed job (caller must re-trigger orchestrate). */
export async function retryExportJob(jobId: string, userId: string): Promise<ExportJobRow | null> {
  const row = await getExportJob(jobId, userId)
  if (!row || row.status !== 'failed') return null
  return updateExportJob(jobId, {
    status: 'queued',
    progress: 0,
    error: null,
    metadata: { ...row.metadata, label: 'Retry queued…' },
  })
}

export async function syncExportJobFromRenderJob(params: {
  jobId: string
  status: ExportJobStatus
  progress: number
  label?: string
  stage?: string
  renderUrl?: string | null
  error?: string | null
  storagePath?: string
  storageBucket?: string
}): Promise<void> {
  await updateExportJob(params.jobId, {
    status: params.status,
    progress: params.progress,
    render_url: params.renderUrl ?? undefined,
    error: params.error ?? undefined,
    metadata: {
      label: params.label,
      stage: params.stage,
      storagePath: params.storagePath,
      storageBucket: params.storageBucket,
    },
  })
}
