import {
  detectInputLanguage,
  languageLabel,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'

/** Creator-facing language codes — extensible; maps to ProjectLanguage for generation. */
export type CreatorLanguageCode =
  | 'en'
  | 'hi'
  | 'gu'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'ar'
  | 'hinglish'
  | 'hi-mixed'

export type SupportedCreatorLanguage = {
  code: CreatorLanguageCode
  label: string
  native?: string
  projectLanguage: ProjectLanguage
}

export type DetectedCreatorLanguage = {
  languageCode: CreatorLanguageCode
  label: string
  isMixed: boolean
  displayName: string
  /** ISO code used by generation pipeline */
  projectLanguage: ProjectLanguage
}

export const SUPPORTED_CREATOR_LANGUAGES: SupportedCreatorLanguage[] = [
  { code: 'en', label: 'English', projectLanguage: 'en' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', projectLanguage: 'hi' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hindi + English', projectLanguage: 'hi' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', projectLanguage: 'gu' },
  { code: 'es', label: 'Spanish', native: 'Español', projectLanguage: 'es' },
  { code: 'fr', label: 'French', native: 'Français', projectLanguage: 'fr' },
  { code: 'de', label: 'German', native: 'Deutsch', projectLanguage: 'de' },
  { code: 'pt', label: 'Portuguese', native: 'Português', projectLanguage: 'pt' },
  { code: 'ar', label: 'Arabic', native: 'العربية', projectLanguage: 'ar' },
]

const HINGLISH_MARKERS =
  /\b(hai|hain|nahi|nahin|kya|kyun|kyo|mujhe|tujhe|tumhe|mera|meri|tera|teri|hamara|aapka|aapko|tumhara|tumko|hum|tum|aap|woh|wo|yeh|ye|aur|bhi|toh|kuch|sab|sabko|matlab|bhai|yaar|dost|dosti|banana|banao|banaye|banaiye|karna|karein|karenge|krna|chahiye|chahta|chahti|accha|achha|acha|theek|thik|bilkul|jaldi|jaroor|zaroor|abhi|insaan|zindagi|pyar|pyaar|mohabbat|dil|maa|baap|beta|beti|bachpan|yaadein|kahani|kahaani)\b/i

const CREATOR_CODE_SET = new Set(SUPPORTED_CREATOR_LANGUAGES.map((l) => l.code))

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text)
}

function hasLatinLetters(text: string): boolean {
  return /[A-Za-z]/.test(text)
}

function countHinglishMarkers(text: string): number {
  return (text.toLowerCase().match(new RegExp(HINGLISH_MARKERS, 'gi')) || []).length
}

function defaultEnglish(): DetectedCreatorLanguage {
  return buildResult('en', false)
}

function buildResult(code: CreatorLanguageCode, isMixed: boolean): DetectedCreatorLanguage {
  const entry =
    SUPPORTED_CREATOR_LANGUAGES.find((l) => l.code === code) ??
    SUPPORTED_CREATOR_LANGUAGES[0]
  const label = entry.label
  const displayName =
    isMixed && (code === 'hinglish' || code === 'hi-mixed')
      ? 'Hinglish'
      : isMixed && code === 'hi'
        ? 'Hindi (mixed)'
        : label
  return {
    languageCode: code,
    label,
    isMixed,
    displayName,
    projectLanguage: entry.projectLanguage,
  }
}

function hinglishResult(): DetectedCreatorLanguage {
  return buildResult('hinglish', true)
}

function toCreatorCode(detected: ProjectLanguage): CreatorLanguageCode {
  if (detected === 'hi') return 'hi'
  if (detected === 'gu') return 'gu'
  if (detected === 'es') return 'es'
  if (detected === 'fr') return 'fr'
  if (detected === 'de') return 'de'
  if (detected === 'pt') return 'pt'
  if (detected === 'ar') return 'ar'
  if (detected === 'ur') return 'hi'
  return 'en'
}

/**
 * Lightweight client/server heuristic — Unicode ranges, Romance/Germanic markers,
 * and Hinglish word patterns. No external deps.
 */
export function detectCreatorLanguage(raw: string): DetectedCreatorLanguage {
  const text = raw.trim()
  if (!text) return defaultEnglish()

  const deva = hasDevanagari(text)
  const latin = hasLatinLetters(text)

  if (deva && latin) return hinglishResult()

  if (deva && !latin) return buildResult('hi', false)

  const base = detectInputLanguage(text)
  const markers = countHinglishMarkers(text)

  if (base === 'en' && markers >= 2) return hinglishResult()
  if (base === 'hi' && latin && markers >= 1) return hinglishResult()

  const code = toCreatorCode(base)
  if (!CREATOR_CODE_SET.has(code)) return defaultEnglish()

  return buildResult(code, false)
}

/** Resolve optional client hint or detect from last user message. */
export function resolveCreatorLanguage(
  text: string,
  hint?: Partial<Pick<DetectedCreatorLanguage, 'languageCode' | 'isMixed'>> | null
): DetectedCreatorLanguage {
  if (hint?.languageCode && CREATOR_CODE_SET.has(hint.languageCode)) {
    const isMixed =
      hint.isMixed === true ||
      hint.languageCode === 'hinglish' ||
      hint.languageCode === 'hi-mixed'
    return buildResult(
      isMixed ? 'hinglish' : (hint.languageCode as CreatorLanguageCode),
      isMixed
    )
  }
  return detectCreatorLanguage(text)
}

/** One-line system prompt append for Mugtee assistant responses. */
export function mugteeLanguageSystemHint(detected: DetectedCreatorLanguage): string {
  const name = detected.displayName
  if (detected.isMixed || detected.languageCode === 'hinglish' || detected.languageCode === 'hi-mixed') {
    return `\n\nLANGUAGE: Respond entirely in Hinglish — mix Hindi and English naturally the way Indian creators speak on Reels. Do not reply in pure English unless the user writes in pure English.`
  }
  if (detected.languageCode === 'en') {
    return `\n\nLANGUAGE: Respond entirely in English unless the user explicitly writes in another language.`
  }
  return `\n\nLANGUAGE: Respond entirely in ${name} (${languageLabel(detected.projectLanguage)}). Do not switch to English or any other language.`
}
