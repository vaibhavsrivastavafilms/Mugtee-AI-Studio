import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

export type ContentLanguageOption = {
  code: ProjectLanguage
  label: string
  native?: string
}

/** Supported output languages for Mugtee content generation. */
export const CONTENT_LANGUAGES: ContentLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'zh', label: 'Chinese', native: '中文' },
]

const STORAGE_KEY = 'mugtee:content-language:v1'

export function loadContentLanguagePreference(): ProjectLanguage {
  if (typeof window === 'undefined') return 'en'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'en'
    const match = CONTENT_LANGUAGES.find((l) => l.code === raw)
    return match?.code ?? 'en'
  } catch {
    return 'en'
  }
}

export function saveContentLanguagePreference(language: ProjectLanguage): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* quota / private mode */
  }
}
