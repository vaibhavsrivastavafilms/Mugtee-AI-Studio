import type { CreatorMode } from '@/lib/create/routes'
import { directorWorkspaceHref, quickCutStudioHref } from '@/lib/create/routes'
import {
  creatorModeFromMugteeMode,
  destinationForMugteeMode,
  MUGTEE_MODE_COOKIE,
  MUGTEE_MODE_STORAGE_KEY,
  mugteeModeFromCreatorMode,
  POST_LOGIN_COOKIE_MAX_AGE,
  POST_LOGIN_REDIRECT_COOKIE,
  POST_LOGIN_REDIRECT_KEY,
} from '@/lib/auth/post-login-redirect'

/** @deprecated Legacy key — kept for backward compatibility. */
export const CREATOR_MODE_STORAGE_KEY = 'mugtee:creator-mode:v1'

function writeCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearCookie(name: string): void {
  writeCookie(name, '', 0)
}

export function persistPostLoginRedirect(
  destination: string,
  mode?: CreatorMode | null
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, destination)
    writeCookie(POST_LOGIN_REDIRECT_COOKIE, destination, POST_LOGIN_COOKIE_MAX_AGE)

    if (mode) {
      storeCreatorMode(mode)
      writeCookie(
        MUGTEE_MODE_COOKIE,
        mugteeModeFromCreatorMode(mode),
        POST_LOGIN_COOKIE_MAX_AGE
      )
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function persistModeEntry(
  mode: CreatorMode,
  params?: Record<string, string | undefined>
): void {
  const destination = modeDestinationHref(mode, params)
  storeCreatorMode(mode)
  persistPostLoginRedirect(destination, mode)
}

export function clearPostLoginRedirectPersistence(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
    clearCookie(POST_LOGIN_REDIRECT_COOKIE)
    clearCookie(MUGTEE_MODE_COOKIE)
  } catch {
    /* ignore */
  }
}

export function readPostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    if (stored) return stored

    const legacyMode = readCreatorMode()
    if (legacyMode) return modeDestinationHref(legacyMode)

    const mugteeMode = localStorage.getItem(MUGTEE_MODE_STORAGE_KEY)
    if (mugteeMode) return destinationForMugteeMode(mugteeMode)
  } catch {
    /* ignore */
  }
  return null
}

export function storeCreatorMode(mode: CreatorMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CREATOR_MODE_STORAGE_KEY, mode)
    localStorage.setItem(MUGTEE_MODE_STORAGE_KEY, mugteeModeFromCreatorMode(mode))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCreatorMode(): CreatorMode | null {
  if (typeof window === 'undefined') return null
  try {
    const legacy = localStorage.getItem(CREATOR_MODE_STORAGE_KEY)
    if (legacy === 'quick' || legacy === 'director') return legacy

    const mugteeMode = localStorage.getItem(MUGTEE_MODE_STORAGE_KEY)
    return creatorModeFromMugteeMode(mugteeMode)
  } catch {
    return null
  }
}

export function modeDestinationHref(
  mode: CreatorMode,
  params?: Record<string, string | undefined>
): string {
  if (mode === 'quick') return quickCutStudioHref(params)
  return directorWorkspaceHref(undefined, params)
}

export function authLoginHref(
  mode: CreatorMode,
  params?: Record<string, string | undefined>
): string {
  const next = modeDestinationHref(mode, params)
  const qs = new URLSearchParams({ next, mode })
  return `/auth/login?${qs.toString()}`
}

export const MODE_LOGIN_COPY = {
  quick: {
    heading: 'Continue to Quick Cut',
    subtext:
      'Generate cinematic reels instantly with AI-powered storytelling.',
  },
  director: {
    heading: 'Enter Director Workspace',
    subtext:
      'Sign in for scene-by-scene control — timeline, storyboards, visual direction, and cinematic compile.',
  },
  default: {
    heading: 'Continue to Quick Cut',
    subtext:
      'Generate cinematic reels instantly with AI-powered storytelling.',
  },
} as const

export function loginCopyForMode(mode: CreatorMode | null | undefined) {
  if (mode === 'quick') return MODE_LOGIN_COPY.quick
  if (mode === 'director') return MODE_LOGIN_COPY.director
  return MODE_LOGIN_COPY.default
}
