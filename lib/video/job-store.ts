import fs from 'fs'
import path from 'path'
import type { RenderJobStatus } from '@/lib/video/types'

const jobs = new Map<string, RenderJobStatus>()
const JOBS_DIR = path.join(process.cwd(), '.tmp', 'render-jobs')

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

function persistJob(job: RenderJobStatus) {
  jobs.set(job.jobId, job)
  writeJobToDisk(job)
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
  const next = { ...current, ...patch }
  persistJob(next)
  return next
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

/** Trim old jobs (dev server memory + disk). */
export function pruneRenderJobs(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs
  for (const [id, job] of jobs) {
    const ts = Number(id.split('-').pop())
    if (Number.isFinite(ts) && ts < cutoff) {
      jobs.delete(id)
      try {
        fs.unlinkSync(jobFilePath(id))
      } catch {
        /* ignore */
      }
    }
  }
  try {
    if (!fs.existsSync(JOBS_DIR)) return
    for (const file of fs.readdirSync(JOBS_DIR)) {
      const ts = Number(file.replace(/\.json$/, '').split('-').pop())
      if (Number.isFinite(ts) && ts < cutoff) {
        fs.unlinkSync(path.join(JOBS_DIR, file))
      }
    }
  } catch {
    /* ignore */
  }
}
