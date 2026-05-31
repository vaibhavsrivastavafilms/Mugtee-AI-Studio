/** localStorage / sessionStorage keys for returning-creator UX. */
export const RETENTION_STORAGE_KEYS = {
  hasCreatedProject: 'mugtee_has_created_project',
  welcomeShownToday: 'mugtee_welcome_shown_today',
} as const

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function markHasCreatedProject(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RETENTION_STORAGE_KEYS.hasCreatedProject, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasCreatedProjectFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(RETENTION_STORAGE_KEYS.hasCreatedProject) === '1'
  } catch {
    return false
  }
}

/** True when user has created before and welcome has not been shown today. */
export function shouldShowWelcomeBack(): boolean {
  if (!hasCreatedProjectFlag()) return false
  if (typeof window === 'undefined') return false
  try {
    const shown = window.sessionStorage.getItem(RETENTION_STORAGE_KEYS.welcomeShownToday)
    return shown !== todayKey()
  } catch {
    return false
  }
}

export function markWelcomeShownToday(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(RETENTION_STORAGE_KEYS.welcomeShownToday, todayKey())
  } catch {
    /* ignore */
  }
}
