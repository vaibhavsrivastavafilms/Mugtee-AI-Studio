'use client'

const JOB_ID_KEY = 'mugtee:generation-job-id:v1'

export function readStoredGenerationJobId(projectId: string | null): string | null {
  if (typeof window === 'undefined' || !projectId) return null
  try {
    const raw = sessionStorage.getItem(JOB_ID_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, string>
    return map[projectId] ?? null
  } catch {
    return null
  }
}

export function writeStoredGenerationJobId(projectId: string, jobId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(JOB_ID_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    map[projectId] = jobId
    sessionStorage.setItem(JOB_ID_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function clearStoredGenerationJobId(projectId: string | null, jobId?: string | null): void {
  if (typeof window === 'undefined' || !projectId) return
  try {
    const raw = sessionStorage.getItem(JOB_ID_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, string>
    if (jobId && map[projectId] !== jobId) return
    delete map[projectId]
    sessionStorage.setItem(JOB_ID_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}
