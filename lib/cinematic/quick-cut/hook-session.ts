const HOOK_SESSION_KEY = 'mugtee:quick-cut:hook-session:v1'

export type QuickCutHookSession = {
  previousHooks: string[]
  hookVariantNumber: number
}

export function saveHookSession(data: QuickCutHookSession) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HOOK_SESSION_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function loadHookSession(): QuickCutHookSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(HOOK_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<QuickCutHookSession>
    return {
      previousHooks: Array.isArray(parsed.previousHooks)
        ? parsed.previousHooks.filter((h): h is string => typeof h === 'string')
        : [],
      hookVariantNumber:
        typeof parsed.hookVariantNumber === 'number' && parsed.hookVariantNumber >= 1
          ? Math.floor(parsed.hookVariantNumber)
          : 1,
    }
  } catch {
    return null
  }
}

export function clearHookSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(HOOK_SESSION_KEY)
}
