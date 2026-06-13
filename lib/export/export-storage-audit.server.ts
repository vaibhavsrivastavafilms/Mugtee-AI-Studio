import 'server-only'

import { randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  persistProjectReel,
  REEL_BUCKET,
} from '@/lib/video/reel-storage-upload'

export type AuditStageStatus = 'PASS' | 'FAIL' | 'SKIP'

export type AuditStageResult = {
  status: AuditStageStatus
  detail?: string
  error?: string
}

export type ExportStorageAuditResult = {
  tag: '[SUPABASE_UPLOAD_AUDIT]'
  verdict: 'PRODUCTION READY' | 'BLOCKED'
  userId: string
  auditProjectId: string
  storagePath: string
  bucket: string
  stages: {
    bucket_exists: AuditStageResult
    upload_permissions: AuditStageResult
    signed_url_generation: AuditStageResult
    object_retrieval: AuditStageResult
    project_update: AuditStageResult
  }
  failure?: {
    rootCause: string
    file: string
    function: string
    line: number
    fix: string
    confidence: 'High' | 'Medium' | 'Low'
  }
}

/** Service-role bucket probe when no user session (infrastructure-only). */
export async function auditReelsBucketWithServiceRole(): Promise<AuditStageResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    return {
      status: 'SKIP',
      detail: 'SUPABASE_SERVICE_ROLE_KEY not set — cannot probe bucket without user session',
    }
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: buckets, error: listErr } = await admin.storage.listBuckets()
  if (listErr) {
    return { status: 'FAIL', error: listErr.message, detail: 'listBuckets failed' }
  }
  const bucket = buckets?.find((b) => b.id === REEL_BUCKET)
  if (!bucket) {
    return {
      status: 'FAIL',
      error: `Bucket "${REEL_BUCKET}" not found`,
      detail: 'Run supabase/RUN_IN_SQL_EDITOR.sql section 0022_reel_render',
    }
  }
  return {
    status: 'PASS',
    detail: `Bucket "${REEL_BUCKET}" exists (public=${String(bucket.public)})`,
  }
}

/** Minimal bytes — storage probe only (not a playable reel). */
function probeMp4Buffer(): Buffer {
  return Buffer.from('mugtee-export-storage-audit-probe')
}

async function auditBucketExists(
  supabase: SupabaseClient
): Promise<AuditStageResult> {
  const { data, error } = await supabase.storage.from(REEL_BUCKET).list('', { limit: 1 })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('bucket') && msg.includes('not found')) {
      return {
        status: 'FAIL',
        error: error.message,
        detail: `Bucket "${REEL_BUCKET}" is missing — run supabase/RUN_IN_SQL_EDITOR.sql (0022_reel_render)`,
      }
    }
    return { status: 'FAIL', error: error.message, detail: 'Could not list reels bucket' }
  }
  return {
    status: 'PASS',
    detail: `Bucket "${REEL_BUCKET}" reachable (${data?.length ?? 0} root objects visible)`,
  }
}

async function auditUpload(
  supabase: SupabaseClient,
  storagePath: string,
  buffer: Buffer
): Promise<AuditStageResult> {
  const { error } = await supabase.storage.from(REEL_BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) {
    return {
      status: 'FAIL',
      error: error.message,
      detail:
        error.message.includes('policy') || error.message.includes('row-level')
          ? 'RLS blocked upload — ensure "reels authenticated upload" policy exists for authenticated users'
          : 'Upload to reels bucket failed',
    }
  }
  return {
    status: 'PASS',
    detail: `Uploaded ${buffer.length} bytes to ${storagePath}`,
  }
}

async function auditSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<AuditStageResult & { signedUrl?: string; publicUrl?: string }> {
  const { data: signed, error: signedErr } = await supabase.storage
    .from(REEL_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (signedErr || !signed?.signedUrl) {
    return {
      status: 'FAIL',
      error: signedErr?.message ?? 'createSignedUrl returned no URL',
      detail: 'Signed URL generation failed',
    }
  }

  const { data: pub } = supabase.storage.from(REEL_BUCKET).getPublicUrl(storagePath)
  if (!pub?.publicUrl) {
    return {
      status: 'FAIL',
      error: 'getPublicUrl returned empty',
      detail: 'Public URL generation failed',
    }
  }

  return {
    status: 'PASS',
    detail: 'createSignedUrl and getPublicUrl both succeeded',
    signedUrl: signed.signedUrl,
    publicUrl: pub.publicUrl,
  }
}

async function auditObjectRetrieval(params: {
  supabase: SupabaseClient
  storagePath: string
  signedUrl: string
  publicUrl: string
  expectedSize: number
}): Promise<AuditStageResult> {
  const signedRes = await fetch(params.signedUrl)
  if (!signedRes.ok) {
    return {
      status: 'FAIL',
      error: `Signed URL fetch HTTP ${signedRes.status}`,
      detail: 'Could not retrieve object via signed URL',
    }
  }
  const signedBody = await signedRes.arrayBuffer()
  if (signedBody.byteLength !== params.expectedSize) {
    return {
      status: 'FAIL',
      error: `Signed URL size mismatch (${signedBody.byteLength} vs ${params.expectedSize})`,
      detail: 'Signed URL object size incorrect',
    }
  }

  const publicRes = await fetch(params.publicUrl)
  if (!publicRes.ok) {
    return {
      status: 'FAIL',
      error: `Public URL fetch HTTP ${publicRes.status}`,
      detail: 'Could not retrieve object via public URL (reels bucket should be public)',
    }
  }

  const { data, error } = await params.supabase.storage
    .from(REEL_BUCKET)
    .download(params.storagePath)
  if (error || !data) {
    return {
      status: 'FAIL',
      error: error?.message ?? 'storage.download failed',
      detail: 'Authenticated storage.download failed (download/file fallback path)',
    }
  }
  if (data.size !== params.expectedSize) {
    return {
      status: 'FAIL',
      error: `download size mismatch (${data.size} vs ${params.expectedSize})`,
      detail: 'storage.download returned wrong size',
    }
  }

  return {
    status: 'PASS',
    detail: 'Retrieved via signed URL, public URL, and storage.download',
  }
}

async function auditProjectUpdate(params: {
  supabase: SupabaseClient
  userId: string
  projectId: string
  videoUrl: string
  storagePath: string
}): Promise<AuditStageResult> {
  const now = new Date().toISOString()
  const { error: insertErr } = await params.supabase.from('cinematic_projects').insert({
    id: params.projectId,
    user_id: params.userId,
    title: 'Storage audit probe',
    prompt: 'export-storage-audit',
    script: '',
    status: 'reviewing',
    updated_at: now,
    created_at: now,
  })
  if (insertErr) {
    return {
      status: 'FAIL',
      error: insertErr.message,
      detail: 'Could not create audit cinematic_projects row',
    }
  }

  await persistProjectReel({
    userId: params.userId,
    projectId: params.projectId,
    videoUrl: params.videoUrl,
    storagePath: params.storagePath,
    title: 'Storage audit probe',
    reelStatus: 'ready',
  })

  const { data: row, error: readErr } = await params.supabase
    .from('cinematic_projects')
    .select('reel_url, reel_status, video_url, reel_rendered_at, status')
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (readErr || !row) {
    return {
      status: 'FAIL',
      error: readErr?.message ?? 'Project row missing after persistProjectReel',
      detail: 'cinematic_projects read-back failed',
    }
  }

  const reelUrl = row.reel_url?.trim()
  const videoUrl = row.video_url?.trim()
  if (reelUrl !== params.videoUrl || videoUrl !== params.videoUrl) {
    return {
      status: 'FAIL',
      error: `Expected reel_url=${params.videoUrl}, got reel_url=${reelUrl}, video_url=${videoUrl}`,
      detail: 'persistProjectReel did not write reel_url/video_url',
    }
  }
  if (row.reel_status !== 'completed') {
    return {
      status: 'FAIL',
      error: `Expected reel_status=completed, got ${row.reel_status}`,
      detail: 'persistProjectReel did not set reel_status',
    }
  }
  if (!row.reel_rendered_at) {
    return {
      status: 'FAIL',
      error: 'reel_rendered_at is null',
      detail: 'persistProjectReel did not set reel_rendered_at',
    }
  }

  const { data: assets, error: assetErr } = await params.supabase
    .from('project_assets')
    .select('id, kind, url, storage_path')
    .eq('project_id', params.projectId)
    .eq('user_id', params.userId)
    .eq('kind', 'video')
    .limit(1)

  if (assetErr || !assets?.length) {
    return {
      status: 'FAIL',
      error: assetErr?.message ?? 'No project_assets video row',
      detail: 'persistProjectReel project_assets insert missing or blocked by RLS',
    }
  }

  return {
    status: 'PASS',
    detail: `Project reel_url, reel_status, video_url, reel_rendered_at, and project_assets verified`,
  }
}

async function cleanupAudit(params: {
  supabase: SupabaseClient
  projectId: string
  storagePath: string
}): Promise<void> {
  try {
    await params.supabase.storage.from(REEL_BUCKET).remove([params.storagePath])
  } catch {
    /* non-fatal */
  }
  try {
    await params.supabase.from('project_assets').delete().eq('project_id', params.projectId)
  } catch {
    /* non-fatal */
  }
  try {
    await params.supabase.from('cinematic_projects').delete().eq('id', params.projectId)
  } catch {
    /* non-fatal */
  }
}

function firstFailure(
  stages: ExportStorageAuditResult['stages']
): ExportStorageAuditResult['failure'] | undefined {
  const order: (keyof ExportStorageAuditResult['stages'])[] = [
    'bucket_exists',
    'upload_permissions',
    'signed_url_generation',
    'object_retrieval',
    'project_update',
  ]

  const meta: Record<
    keyof ExportStorageAuditResult['stages'],
    { file: string; function: string; line: number; fix: string }
  > = {
    bucket_exists: {
      file: 'supabase/RUN_IN_SQL_EDITOR.sql',
      function: '0022_reel_render bucket + policies',
      line: 118,
      fix: 'Run the reels bucket migration in Supabase SQL Editor (insert bucket + RLS policies).',
    },
    upload_permissions: {
      file: 'lib/video/reel-storage-upload.ts',
      function: 'uploadReelMp4',
      line: 37,
      fix: 'Ensure storage policy "reels authenticated upload" allows insert for authenticated users on bucket reels.',
    },
    signed_url_generation: {
      file: 'lib/video/reel-storage-upload.ts',
      function: 'uploadReelMp4',
      line: 65,
      fix: 'Verify reels bucket exists and object was uploaded; check Supabase storage signing config.',
    },
    object_retrieval: {
      file: 'app/api/reels/download/[projectId]/file/route.ts',
      function: 'loadReelBuffer',
      line: 39,
      fix: 'Ensure reels bucket is public (select policy) and final-reel.mp4 path matches {projectId}/final-reel.mp4.',
    },
    project_update: {
      file: 'lib/video/reel-storage-upload.ts',
      function: 'persistProjectReel',
      line: 124,
      fix: 'Verify cinematic_projects and project_assets RLS allow owner insert/update for the authenticated user.',
    },
  }

  for (const key of order) {
    const stage = stages[key]
    if (stage.status === 'FAIL') {
      const m = meta[key]
      return {
        rootCause: stage.error ?? stage.detail ?? `${key} failed`,
        file: m.file,
        function: m.function,
        line: m.line,
        fix: m.fix,
        confidence: 'High',
      }
    }
  }
  return undefined
}

/** End-to-end Supabase storage audit for authenticated reel export workflow. */
export async function runExportStorageAudit(userId: string): Promise<ExportStorageAuditResult> {
  const supabase = createSupabaseServerClient()
  const auditProjectId = randomUUID()
  const storagePath = `${auditProjectId}/final-reel.mp4`
  const buffer = probeMp4Buffer()

  const stages: ExportStorageAuditResult['stages'] = {
    bucket_exists: { status: 'FAIL', detail: 'Not run' },
    upload_permissions: { status: 'FAIL', detail: 'Not run' },
    signed_url_generation: { status: 'FAIL', detail: 'Not run' },
    object_retrieval: { status: 'FAIL', detail: 'Not run' },
    project_update: { status: 'FAIL', detail: 'Not run' },
  }

  try {
    stages.bucket_exists = await auditBucketExists(supabase)
    if (stages.bucket_exists.status === 'FAIL') {
      return buildResult(userId, auditProjectId, storagePath, stages)
    }

    stages.upload_permissions = await auditUpload(supabase, storagePath, buffer)
    if (stages.upload_permissions.status === 'FAIL') {
      return buildResult(userId, auditProjectId, storagePath, stages)
    }

    const signedStage = await auditSignedUrl(supabase, storagePath)
    stages.signed_url_generation = signedStage
    if (signedStage.status === 'FAIL' || !signedStage.publicUrl || !signedStage.signedUrl) {
      return buildResult(userId, auditProjectId, storagePath, stages)
    }

    stages.object_retrieval = await auditObjectRetrieval({
      supabase,
      storagePath,
      signedUrl: signedStage.signedUrl,
      publicUrl: signedStage.publicUrl,
      expectedSize: buffer.length,
    })
    if (stages.object_retrieval.status === 'FAIL') {
      return buildResult(userId, auditProjectId, storagePath, stages)
    }

    stages.project_update = await auditProjectUpdate({
      supabase,
      userId,
      projectId: auditProjectId,
      videoUrl: signedStage.publicUrl,
      storagePath,
    })

    return buildResult(userId, auditProjectId, storagePath, stages)
  } finally {
    await cleanupAudit({ supabase, projectId: auditProjectId, storagePath })
  }
}

function buildResult(
  userId: string,
  auditProjectId: string,
  storagePath: string,
  stages: ExportStorageAuditResult['stages']
): ExportStorageAuditResult {
  const allPass = Object.values(stages).every((s) => s.status === 'PASS')
  const failure = allPass ? undefined : firstFailure(stages)
  const result: ExportStorageAuditResult = {
    tag: '[SUPABASE_UPLOAD_AUDIT]',
    verdict: allPass ? 'PRODUCTION READY' : 'BLOCKED',
    userId,
    auditProjectId,
    storagePath,
    bucket: REEL_BUCKET,
    stages,
    failure,
  }
  console.info(result.tag, result)
  return result
}
