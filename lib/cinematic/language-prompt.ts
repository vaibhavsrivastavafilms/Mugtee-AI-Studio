import {
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'

/** Mandatory language lock injected into every generation / regeneration prompt. */
export function languageDirective(language: ProjectLanguage): string {
  const label = languageLabel(language)
  return [
    `LANGUAGE LOCK (${language} / ${label}):`,
    `Write ALL output in ${label}. Do not use any other language.`,
    `This applies to title, hook, script beats, narration, captions, scene descriptions, and CTA.`,
    language === 'en'
      ? `Use natural English. Never switch to German, Spanish, French, or any other language unless the creator brief explicitly mixes languages.`
      : `Never translate to English or any language other than ${label}.`,
  ].join(' ')
}

export function languageDirectiveFromCode(raw: unknown): string {
  return languageDirective(normalizeProjectLanguage(raw))
}
