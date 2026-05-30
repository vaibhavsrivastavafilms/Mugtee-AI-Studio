const PREFIX = 'mugtee:project-feedback:'

export function projectFeedbackStorageKey(projectId: string | null | undefined): string | null {
  const id = String(projectId || '').trim()
  if (!id) return null
  return `${PREFIX}${id}`
}

export function hasProjectFeedbackSubmitted(projectId: string | null | undefined): boolean {
  const key = projectFeedbackStorageKey(projectId)
  if (!key || typeof window === 'undefined') return false
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markProjectFeedbackSubmitted(projectId: string | null | undefined): void {
  const key = projectFeedbackStorageKey(projectId)
  if (!key || typeof window === 'undefined') return
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}
