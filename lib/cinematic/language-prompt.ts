import {
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'

/** Mandatory language lock injected into every generation / regeneration prompt. */
export function languageDirective(language: ProjectLanguage): string {
  const label = languageLabel(language)
  if (language === 'en') {
    return `LANGUAGE: Generate all output in English. Do not switch languages unless the creator brief explicitly mixes languages.`
  }
  return [
    `LANGUAGE LOCK (${language} / ${label}):`,
    `Generate ALL output in ${label} (${language}).`,
    `Never translate to English.`,
    `Preserve the original language of the creator brief, hook, script, captions, and scene narration.`,
    `If the brief is multilingual, keep the same language mix — do not anglicize.`,
  ].join(' ')
}

export function languageDirectiveFromCode(raw: unknown, fallbackText?: string): string {
  return languageDirective(normalizeProjectLanguage(raw, fallbackText))
}
