/** Client-only onboarding flags — localStorage, no schema changes. */

export const ONBOARDING_KEYS = {
  complete: 'mugtee_onboarding_complete',
  hasCreatedProject: 'mugtee_has_created_project',
  firstGeneration: 'mugtee_first_generation_complete',
} as const

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem(key))
  } catch {
    return false
  }
}

function writeFlag(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
}

/** True when user has never finished onboarding or created a project. */
export function isFirstTimeUser(): boolean {
  return !readFlag(ONBOARDING_KEYS.complete) && !readFlag(ONBOARDING_KEYS.hasCreatedProject)
}

export function hasCompletedFirstGeneration(): boolean {
  return readFlag(ONBOARDING_KEYS.firstGeneration)
}

export function markOnboardingComplete(): void {
  writeFlag(ONBOARDING_KEYS.complete)
}

export function markHasCreatedProject(): void {
  writeFlag(ONBOARDING_KEYS.hasCreatedProject)
  writeFlag(ONBOARDING_KEYS.complete)
}

export function markFirstGeneration(): void {
  writeFlag(ONBOARDING_KEYS.firstGeneration)
  markHasCreatedProject()
}
