import fs from 'fs'
import os from 'os'
import path from 'path'
import type { RenderJobStatus } from '@/lib/video/types'

const jobs = new Map<string, RenderJobStatus>()
/** Vercel/serverless: only /tmp is writable — not project cwd. */
const JOBS_DIR = path.join(os.tmpdir(), 'mugtee-render-jobs')

function safeJobId(jobId: string): string {
  return jobId.replace(/[^a-zA-Z0-9_-]/g, '')
}

function jobFilePath(jobId: string): string {
  return path.join(JOBS_DIR, `${safeJobId(jobId)}.json`)
}

function writeJobToDisk(job: RenderJobStatus) {
  try {
    fs.mkdirSync(JOBS_DIR, { recursive: true })
    fs.writeFileSync(jobFilePath(job.jobId), JSON.stringify(job), 'utf8')
  } catch {
    /* disk persistence is best-effort */
  }
}

function readJobFromDisk(jobId: string): RenderJobStatus | null {
  try {
    const raw = fs.readFileSync(jobFilePath(jobId), 'utf8')
    return JSON.parse(raw) as RenderJobStatus
  } catch {
    return null
  }
}

function withTimestamp(job: RenderJobStatus, patch?: Partial<RenderJobStatus>): RenderJobStatus {
  return {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  }
}

function persistJob(job: RenderJobStatus) {
  const stamped = job.updatedAt ? job : withTimestamp(job)
  jobs.set(stamped.jobId, stamped)
  writeJobToDisk(stamped)
}

export function createRenderJob(jobId: string): RenderJobStatus {
  const existing = getRenderJob(jobId)
  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return existing
  }

  const job: RenderJobStatus = {
    jobId,
    percent: 0,
    stage: 'prepare',
    label: 'Preparing render…',
    videoUrl: null,
    thumbnailUrl: null,
    status: 'queued',
    error: null,
    updatedAt: Date.now(),
  }
  persistJob(job)
  return job
}

export function updateRenderJob(
  jobId: string,
  patch: Partial<RenderJobStatus>
): RenderJobStatus | null {
  const current = getRenderJob(jobId)
  if (!current) return null
  const next = withTimestamp(current, patch)
  persistJob(next)
  return next
}

/** Extend TTL for jobs still queued or running (default 3 hours). */
export const ACTIVE_RENDER_JOB_TTL_MS = 3 * 60 * 60 * 1000

export function touchRenderJobHeartbeat(jobId: string): RenderJobStatus | null {
  const current = getRenderJob(jobId)
  if (!current) return null
  if (current.status !== 'queued' && current.status !== 'running') return current
  return updateRenderJob(jobId, { label: current.label })
}

export function getRenderJob(jobId: string): RenderJobStatus | null {
  const mem = jobs.get(jobId)
  if (mem) return mem
  const disk = readJobFromDisk(jobId)
  if (disk) {
    jobs.set(jobId, disk)
    return disk
  }
  return null
}

function jobAgeMs(job: RenderJobStatus): number {
  if (typeof job.updatedAt === 'number' && job.updatedAt > 0) {
    return Date.now() - job.updatedAt
  }
  const ts = Number(job.jobId.split('-').pop())
  return Number.isFinite(ts) ? Date.now() - ts : 0
}

function isActiveRenderJob(job: RenderJobStatus): boolean {
  return job.status === 'queued' || job.status === 'running'
}

/** Trim old jobs (dev server memory + disk). Active jobs use extended TTL. */
export function pruneRenderJobs(maxAgeMs = 60 * 60 * 1000) {
  const pruneOne = (id: string, job?: RenderJobStatus | null) => {
    const resolved = job ?? getRenderJob(id)
    if (!resolved) return
    const ttl = isActiveRenderJob(resolved) ? ACTIVE_RENDER_JOB_TTL_MS : maxAgeMs
    if (jobAgeMs(resolved) < ttl) return
    jobs.delete(id)
    try {
      fs.unlinkSync(jobFilePath(id))
    } catch {
      /* ignore */
    }
  }

  for (const [id, job] of jobs) {
    pruneOne(id, job)
  }
  try {
    if (!fs.existsSync(JOBS_DIR)) return
    for (const file of fs.readdirSync(JOBS_DIR)) {
      const id = file.replace(/\.json$/, '')
      pruneOne(id)
    }
  } catch {
    /* ignore */
  }
}
