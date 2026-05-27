const SCROLL_PREFIX = 'mugtee:workflow:scroll:v1:'
const STORYBOARD_FOCUS_PREFIX = 'mugtee:workflow:storyboard-focus:v1:'

export function saveWorkflowScroll(step: string, y: number) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${step}`, String(Math.round(y)))
  } catch {
    /* ignore */
  }
}

export function restoreWorkflowScroll(step: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${SCROLL_PREFIX}${step}`)
    if (!raw) return null
    const y = Number(raw)
    return Number.isFinite(y) ? y : null
  } catch {
    return null
  }
}

export function saveStoryboardFocus(projectId: string, sceneIndex: number) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${STORYBOARD_FOCUS_PREFIX}${projectId}`, String(sceneIndex))
  } catch {
    /* ignore */
  }
}

export function getStoryboardFocus(projectId: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${STORYBOARD_FOCUS_PREFIX}${projectId}`)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
