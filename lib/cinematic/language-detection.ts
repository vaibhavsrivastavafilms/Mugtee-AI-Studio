/** ISO 639-1 language codes used across Mugtee workflow state. */
export type ProjectLanguage =
  | 'en'
  | 'hi'
  | 'ur'
  | 'es'
  | 'fr'
  | 'gu'
  | 'ar'
  | 'other'

const HINGLISH_MARKERS =
  /\b(hai|hain|nahi|nahin|kya|kyun|kyo|mujhe|tujhe|tumhe|mera|meri|tera|teri|hamara|aapka|aapko|tumhara|tumko|hum|tum|aap|woh|wo|yeh|ye|aur|bhi|toh|kuch|sab|sabko|matlab|bhai|yaar|dost|dosti|banana|banao|banaye|banaiye|karna|karein|karenge|krna|chahiye|chahta|chahti|accha|achha|acha|theek|thik|bilkul|jaldi|jaroor|zaroor|abhi|insaan|zindagi|pyar|pyaar|mohabbat|dil|maa|baap|beta|beti|bachpan|yaadein|kahani|kahaani)\b/i

const LANGUAGE_LABELS: Record<ProjectLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  gu: 'Gujarati',
  ar: 'Arabic',
  other: 'the same language as the input',
}

/** Lightweight Unicode + marker heuristic — no external API. */
export function detectInputLanguage(raw: string): ProjectLanguage {
  const text = raw.trim()
  if (!text) return 'en'

  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/[\u0600-\u06FF]/.test(text)) return /[\u0670-\u06D3]/.test(text) ? 'ur' : 'ar'
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'
  if (/[¿¡]|(?:\b(el|la|los|las|que|por|para|con|como|pero|muy|más|esta|este|también|porque)\b)/i.test(text)) {
    return 'es'
  }
  if (/(?:\b(je|tu|vous|nous|avec|pour|dans|mais|très|aussi|être|cette|comme|quoi)\b|[àâçéèêëîïôùûü])/i.test(text)) {
    return 'fr'
  }

  const hasNonAscii = /[^\x00-\x7F]/.test(text)
  if (hasNonAscii) return 'other'

  const matches = (text.toLowerCase().match(new RegExp(HINGLISH_MARKERS, 'gi')) || []).length
  if (matches >= 2) return 'hi'

  return 'en'
}

export function normalizeProjectLanguage(raw: unknown, fallbackText?: string): ProjectLanguage {
  if (typeof raw === 'string' && raw.trim()) {
    const code = raw.trim().toLowerCase().slice(0, 8)
    const map: Record<string, ProjectLanguage> = {
      en: 'en',
      english: 'en',
      hi: 'hi',
      hindi: 'hi',
      hinglish: 'hi',
      ur: 'ur',
      urdu: 'ur',
      es: 'es',
      spanish: 'es',
      fr: 'fr',
      french: 'fr',
      gu: 'gu',
      gujarati: 'gu',
      ar: 'ar',
      arabic: 'ar',
      other: 'other',
    }
    if (map[code]) return map[code]
  }
  if (fallbackText?.trim()) return detectInputLanguage(fallbackText)
  return 'en'
}

export function languageLabel(code: ProjectLanguage): string {
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS.other
}
