import {
  detectCreatorLanguage,
  type DetectedCreatorLanguage,
} from '@/lib/i18n/detect-creator-language'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

export const CREATOR_LANGUAGE_SESSION_KEY = 'mugtee:creator-language:v1'

export type CreatorLanguageSession = DetectedCreatorLanguage & {
  updatedAt: number
}

export function toCreatorLanguageSession(detected: DetectedCreatorLanguage): CreatorLanguageSession {
  return { ...detected, updatedAt: Date.now() }
}

export function saveCreatorLanguageSession(detected: DetectedCreatorLanguage): void {
  if (typeof window === 'undefined') return
  try {
    const payload: CreatorLanguageSession = {
      ...detected,
      updatedAt: Date.now(),
    }
    sessionStorage.setItem(CREATOR_LANGUAGE_SESSION_KEY, JSON.stringify(payload))
  } catch {
    /* private mode / quota */
  }
}

export function loadCreatorLanguageSession(): CreatorLanguageSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CREATOR_LANGUAGE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatorLanguageSession
    if (!parsed?.languageCode || !parsed?.projectLanguage) return null
    return parsed
  } catch {
    return null
  }
}

/** Detect from user text, persist to session, return result. */
export function persistCreatorLanguageFromText(text: string): DetectedCreatorLanguage {
  const detected = detectCreatorLanguage(text)
  saveCreatorLanguageSession(detected)
  return detected
}

export function sessionProjectLanguage(): ProjectLanguage | null {
  return loadCreatorLanguageSession()?.projectLanguage ?? null
}

export function sessionLanguageMixed(): boolean {
  return loadCreatorLanguageSession()?.isMixed ?? false
}
