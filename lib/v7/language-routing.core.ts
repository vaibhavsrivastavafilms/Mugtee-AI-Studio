import {
  detectInputLanguage,
  languageLabel,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import {
  buildV7ProductionConstraintsBlock,
  V7_CINEMATIC_VIDEO_FRAMEWORK,
} from '@/lib/v7/cinematic-video-framework.core'
import type { V7CreativeBrief } from '@/types/v7/production'

export { V7_CINEMATIC_VIDEO_FRAMEWORK } from '@/lib/v7/cinematic-video-framework.core'

/** Supported V7 content languages — single source of truth for routing. */
export type V7ContentLanguage = 'en' | 'hi' | 'gu'

const V7_CONTENT_LANGUAGE_SET = new Set<V7ContentLanguage>(['en', 'hi', 'gu'])

export function isV7ContentLanguage(value: unknown): value is V7ContentLanguage {
  return typeof value === 'string' && V7_CONTENT_LANGUAGE_SET.has(value as V7ContentLanguage)
}

/** Explicit user instruction overrides automatic detection. */
export function parseExplicitV7LanguageRequest(text: string): V7ContentLanguage | null {
  const sample = text.trim()
  if (!sample) return null

  if (
    /\b(?:in|make|write|create|generate|produce|record)\b[^.\n]{0,40}\bgujarati\b/i.test(sample) ||
    /(?:ગુજરાતી|ગુજરાત)/.test(sample)
  ) {
    return 'gu'
  }

  if (
    /\b(?:in|make|write|create|generate|produce|record)\b[^.\n]{0,40}\bhindi\b/i.test(sample) ||
    /(?:हिंदी|हिन्दी)/.test(sample)
  ) {
    return 'hi'
  }

  if (/\b(?:in|make|write|create|generate|produce|record)\b[^.\n]{0,40}\benglish\b/i.test(sample)) {
    return 'en'
  }

  return null
}

export function detectV7ContentLanguage(text: string): V7ContentLanguage {
  const explicit = parseExplicitV7LanguageRequest(text)
  if (explicit) return explicit

  const detected = detectInputLanguage(text)
  if (detected === 'gu') return 'gu'
  if (detected === 'hi' || detected === 'ur') return 'hi'
  return 'en'
}

export function normalizeV7ContentLanguage(raw: unknown): V7ContentLanguage {
  if (typeof raw !== 'string' || !raw.trim()) return 'en'
  const code = raw.trim().toLowerCase()

  if (code === 'gu' || code === 'gujarati' || code.startsWith('gujarati ')) return 'gu'
  if (code === 'hi' || code === 'hindi' || code === 'hinglish' || code.startsWith('hindi ')) {
    return 'hi'
  }
  if (code === 'en' || code === 'english' || code.startsWith('english ')) return 'en'

  return 'en'
}

export function resolveV7ContentLanguageFromBrief(
  brief: Pick<V7CreativeBrief, 'language'>
): V7ContentLanguage {
  return normalizeV7ContentLanguage(brief.language)
}

export function v7LanguageLabel(code: V7ContentLanguage): string {
  return languageLabel(code as ProjectLanguage)
}

/** Authoritative brief.language value — ISO code stored in creative brief. */
export function applyResolvedV7LanguageToBrief(
  brief: V7CreativeBrief,
  prompt: string
): V7CreativeBrief {
  const code = detectV7ContentLanguage(prompt)
  return { ...brief, language: code }
}

export function v7LanguageDirectiveForBrief(brief: Pick<V7CreativeBrief, 'language'>): string {
  const code = resolveV7ContentLanguageFromBrief(brief)
  return languageDirective(code as ProjectLanguage)
}

export function v7LanguageDirectiveForPrompt(prompt: string): string {
  return languageDirective(detectV7ContentLanguage(prompt) as ProjectLanguage)
}

export function v7VoiceLanguageCode(brief: Pick<V7CreativeBrief, 'language'>): V7ContentLanguage {
  return resolveV7ContentLanguageFromBrief(brief)
}

/** Base instructions appended to every raw creator input before generation. */
export const V7_USER_INPUT_FRAMEWORK = `MUGTEE USER INPUT FRAMEWORK:
- The creator input below is the authoritative source for topic, intent, duration, platform, tone, and content language.
- Resolve content language from the input (Gujarati script → gu, Hindi/Devanagari → hi, English → en). Explicit language requests override detection.
- All user-facing outputs (concepts, hooks, script, narration, dialogue, captions) must match the resolved content language.
- Visual/image generation may use English cinematic terminology internally when required by the provider.
- Honor explicit duration, aspect ratio, and platform hints. Do not inflate runtime or scene count beyond the request.
- Preserve local and cultural details from the input (places, cuisine, language, festivals). Do not substitute a different topic or language.`

/** Reusable creator-input block: framework + cinematic rules + language lock + constraints + raw user text. */
export function buildV7FramedUserInput(rawPrompt: string, label = 'CREATOR INPUT'): string {
  const prompt = rawPrompt.trim()
  const languageLock = v7LanguageDirectiveForPrompt(prompt || ' ')
  const constraints = buildV7ProductionConstraintsBlock(prompt)
  const sections = [
    V7_USER_INPUT_FRAMEWORK,
    '',
    V7_CINEMATIC_VIDEO_FRAMEWORK,
    '',
    languageLock,
    '',
    constraints,
    '',
    `${label}:`,
  ]
  if (prompt) sections.push(prompt)
  return sections.join('\n')
}
