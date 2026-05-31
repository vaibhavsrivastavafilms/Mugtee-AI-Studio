export type CreatorExperienceLevel = 'noob' | 'director'

export const DEFAULT_CREATOR_EXPERIENCE: CreatorExperienceLevel = 'noob'

export type CreatorExperienceOption = {
  id: CreatorExperienceLevel
  label: string
  description: string
}

export const CREATOR_EXPERIENCE_LEVELS: CreatorExperienceOption[] = [
  {
    id: 'noob',
    label: 'Noob',
    description: 'Guided defaults — prompt and generate with fewer controls',
  },
  {
    id: 'director',
    label: 'Director',
    description: 'Full creative control — blueprints, mood, voice, and advanced options',
  },
]

const STORAGE_KEY = 'mugtee:creator-experience:v1'
const LEVEL_IDS = new Set<string>(CREATOR_EXPERIENCE_LEVELS.map((level) => level.id))

export function normalizeCreatorExperience(raw?: unknown): CreatorExperienceLevel {
  if (typeof raw === 'string' && LEVEL_IDS.has(raw)) {
    return raw as CreatorExperienceLevel
  }
  return DEFAULT_CREATOR_EXPERIENCE
}

export function creatorExperienceById(id: CreatorExperienceLevel): CreatorExperienceOption {
  return CREATOR_EXPERIENCE_LEVELS.find((level) => level.id === id) ?? CREATOR_EXPERIENCE_LEVELS[0]
}

export function isDirectorExperience(level?: CreatorExperienceLevel | string | null): boolean {
  return normalizeCreatorExperience(level) === 'director'
}

export function loadCreatorExperiencePreference(): CreatorExperienceLevel {
  if (typeof window === 'undefined') return DEFAULT_CREATOR_EXPERIENCE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CREATOR_EXPERIENCE
    return normalizeCreatorExperience(raw)
  } catch {
    return DEFAULT_CREATOR_EXPERIENCE
  }
}

export function saveCreatorExperiencePreference(level: CreatorExperienceLevel): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, level)
  } catch {
    /* quota / private mode */
  }
}
