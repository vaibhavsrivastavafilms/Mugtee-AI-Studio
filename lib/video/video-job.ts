import fs from 'fs'
import os from 'os'
import path from 'path'
import type { VideoGenerationStatus, VideoProviderId } from '@/lib/video-providers/types'

export type VideoJobRecord = {
  jobId: string
  sceneId: string
  projectId?: string | null
  userId?: string | null
  provider: VideoProviderId
  status: VideoGenerationStatus
  label: string
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: number | null
  generationTimeMs: number | null
  error: string | null
  providerTaskId?: string | null
  updatedAt: number
}

const jobs = new Map<string, VideoJobRecord>()
const JOBS_DIR = path.join(os.tmpdir(), 'mugtee-scene-video-jobs')

function safeJobId(jobId: string): string {
  return jobId.replace(/[^a-zA-Z0-9_-]/g, '')
}

function jobFilePath(jobId: string): string {
  return path.join(JOBS_DIR, `${safeJobId(jobId)}.json`)
}

function writeJobToDisk(job: VideoJobRecord) {
  try {
    fs.mkdirSync(JOBS_DIR, { recursive: true })
    fs.writeFileSync(jobFilePath(job.jobId), JSON.stringify(job), 'utf8')
  } catch {
    /* best-effort */
  }
}

function readJobFromDisk(jobId: string): VideoJobRecord | null {
  try {
    const raw = fs.readFileSync(jobFilePath(jobId), 'utf8')
    return JSON.parse(raw) as VideoJobRecord
  } catch {
    return null
  }
}

function persistJob(job: VideoJobRecord) {
  jobs.set(job.jobId, job)
  writeJobToDisk(job)
}

export function createVideoJob(input: {
  jobId: string
  sceneId: string
  provider: VideoProviderId
  projectId?: string | null
  userId?: string | null
}): VideoJobRecord {
  const existing = getVideoJob(input.jobId)
  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return existing
  }

  const job: VideoJobRecord = {
    jobId: input.jobId,
    sceneId: input.sceneId,
    projectId: input.projectId ?? null,
    userId: input.userId ?? null,
    provider: input.provider,
    status: 'queued',
    label: 'Queued for video generation…',
    videoUrl: null,
    thumbnailUrl: null,
    duration: null,
    generationTimeMs: null,
    error: null,
    providerTaskId: null,
    updatedAt: Date.now(),
  }
  persistJob(job)
  return job
}

export function updateVideoJob(
  jobId: string,
  patch: Partial<VideoJobRecord>
): VideoJobRecord | null {
  const current = getVideoJob(jobId)
  if (!current) return null
  const next: VideoJobRecord = { ...current, ...patch, updatedAt: Date.now() }
  persistJob(next)
  return next
}

export function getVideoJob(jobId: string): VideoJobRecord | null {
  const mem = jobs.get(jobId)
  if (mem) return mem
  const disk = readJobFromDisk(jobId)
  if (disk) {
    jobs.set(jobId, disk)
    return disk
  }
  return null
}

export const ACTIVE_VIDEO_JOB_TTL_MS = 2 * 60 * 60 * 1000

export function pruneVideoJobs(maxAgeMs = 60 * 60 * 1000) {
  const pruneOne = (id: string, job?: VideoJobRecord | null) => {
    const resolved = job ?? getVideoJob(id)
    if (!resolved) return
    const ttl =
      resolved.status === 'queued' || resolved.status === 'running'
        ? ACTIVE_VIDEO_JOB_TTL_MS
        : maxAgeMs
    if (Date.now() - resolved.updatedAt < ttl) return
    jobs.delete(id)
    try {
      fs.unlinkSync(jobFilePath(id))
    } catch {
      /* ignore */
    }
  }

  for (const [id, job] of jobs) pruneOne(id, job)
  try {
    if (!fs.existsSync(JOBS_DIR)) return
    for (const file of fs.readdirSync(JOBS_DIR)) {
      pruneOne(file.replace(/\.json$/, ''))
    }
  } catch {
    /* ignore */
  }
}
