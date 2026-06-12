/** Durable generation_jobs IDs are prefixed at creation time (see POST /api/generation/jobs). */
export function isValidGenerationJobId(jobId: string | null | undefined): jobId is string {
  if (!jobId?.trim()) return false
  return jobId.startsWith('gen_')
}
