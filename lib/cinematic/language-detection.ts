/** ISO 639-1 language codes used across Mugtee workflow state. */
export type ProjectLanguage =
  | 'en'
  | 'hi'
  | 'ur'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'it'
  | 'gu'
  | 'ar'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'other'

const HINGLISH_MARKERS =
  /\b(hai|hain|nahi|nahin|kya|kyun|kyo|mujhe|tujhe|tumhe|mera|meri|tera|teri|hamara|aapka|aapko|tumhara|tumko|hum|tum|aap|woh|wo|yeh|ye|aur|bhi|toh|kuch|sab|sabko|matlab|bhai|yaar|dost|dosti|banana|banao|banaye|banaiye|karna|karein|karenge|krna|chahiye|chahta|chahti|accha|achha|acha|theek|thik|bilkul|jaldi|jaroor|zaroor|abhi|insaan|zindagi|pyar|pyaar|mohabbat|dil|maa|baap|beta|beti|bachpan|yaadein|kahani|kahaani)\b/i

const LANGUAGE_LABELS: Record<ProjectLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  gu: 'Gujarati',
  ar: 'Arabic',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  other: 'the same language as the input',
}

const LANGUAGE_CODE_MAP: Record<string, ProjectLanguage> = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  hinglish: 'hi',
  ur: 'ur',
  urdu: 'ur',
  es: 'es',
  spanish: 'es',
  espanol: 'es',
  fr: 'fr',
  french: 'fr',
  de: 'de',
  german: 'de',
  deutsch: 'de',
  pt: 'pt',
  portuguese: 'pt',
  it: 'it',
  italian: 'it',
  gu: 'gu',
  gujarati: 'gu',
  ar: 'ar',
  arabic: 'ar',
  ja: 'ja',
  japanese: 'ja',
  ko: 'ko',
  korean: 'ko',
  zh: 'zh',
  chinese: 'zh',
  mandarin: 'zh',
  other: 'other',
}

/** Lightweight Unicode + marker heuristic — opt-in only; never used for browser locale. */
export function detectInputLanguage(raw: string): ProjectLanguage {
  const text = raw.trim()
  if (!text) return 'en'

  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/[\u0600-\u06FF]/.test(text)) return /[\u0670-\u06D3]/.test(text) ? 'ur' : 'ar'
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'
  if (/[\u3040-\u30FF]/.test(text)) return 'ja'
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'
  if (/[¿¡]|(?:\b(el|la|los|las|que|por|para|con|como|pero|muy|más|esta|este|también|porque)\b)/i.test(text)) {
    return 'es'
  }
  if (/(?:\b(je|tu|vous|nous|avec|pour|dans|mais|très|aussi|être|cette|comme|quoi)\b|[àâçéèêëîïôùûü])/i.test(text)) {
    return 'fr'
  }
  if (/(?:\b(der|die|das|und|ist|nicht|auch|für|mit|aber|sehr|wie|wir|ihr|sie|ein|eine)\b|[äöüß])/i.test(text)) {
    return 'de'
  }
  if (/(?:\b(não|voce|você|com|para|mais|muito|como|também|porque|está|estao)\b)/i.test(text)) {
    return 'pt'
  }

  const hasNonAscii = /[^\x00-\x7F]/.test(text)
  if (hasNonAscii) return 'other'

  const matches = (text.toLowerCase().match(new RegExp(HINGLISH_MARKERS, 'gi')) || []).length
  if (matches >= 2) return 'hi'

  return 'en'
}

/** Resolve explicit language code. Defaults to English — never auto-detects from topic or browser. */
export function normalizeProjectLanguage(raw: unknown): ProjectLanguage {
  if (typeof raw === 'string' && raw.trim()) {
    const code = raw.trim().toLowerCase().slice(0, 12)
    if (LANGUAGE_CODE_MAP[code]) return LANGUAGE_CODE_MAP[code]
  }
  return 'en'
}

export function languageLabel(code: ProjectLanguage): string {
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS.other
}
