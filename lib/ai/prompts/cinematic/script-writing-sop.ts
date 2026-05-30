/**
 * Faceless YouTube script-writing SOP — reference-style matching for Mugtee script generation.
 * Encodes a 3-step Claude workflow: analyze reference → retention breakdown → write matching script.
 */

export const REFERENCE_SCRIPT_MAX_CHARS = 24_000
export const REFERENCE_SCRIPT_MIN_CHARS = 80

export type ScriptWritingSopInput = {
  topic: string
  durationSec: number
  platform?: string
  referenceScript: string
}

/** Normalize optional reference script from API / store payloads. */
export function coerceReferenceScript(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (trimmed.length < REFERENCE_SCRIPT_MIN_CHARS) return undefined
  return trimmed.slice(0, REFERENCE_SCRIPT_MAX_CHARS)
}

/** Map video duration to spoken word-count targets (~120–150 wpm faceless narration). */
export function durationToWordCountTarget(durationSec: number): {
  min: number
  max: number
  label: string
} {
  if (durationSec <= 60) {
    return { min: 150, max: 200, label: `${durationSec}s short-form reel` }
  }
  if (durationSec <= 180) {
    return {
      min: Math.round(durationSec * 2.0),
      max: Math.round(durationSec * 2.5),
      label: `${Math.round(durationSec / 60)} min short video`,
    }
  }
  const minutes = durationSec / 60
  if (minutes >= 8) {
    return { min: 1200, max: 1500, label: '10 min faceless YouTube video' }
  }
  return {
    min: Math.round(minutes * 120),
    max: Math.round(minutes * 150),
    label: `${Math.round(minutes)} min video`,
  }
}

/** Attention-reset cadence — scaled for Quick Cut (60s) vs long-form faceless. */
export function attentionResetIntervalSec(durationSec: number): { min: number; max: number } {
  if (durationSec <= 60) {
    return { min: 8, max: 15 }
  }
  return { min: 20, max: 40 }
}

/** Soft word-count hint for all scripts (even without a reference). */
export function scriptWordCountHint(durationSec: number): string {
  const { min, max, label } = durationToWordCountTarget(durationSec)
  return `Target script length: ${min}–${max} words (${label}). Match spoken pacing to ${durationSec}s total runtime.`
}

/** System-prompt augment when a reference script drives style matching. */
export function buildScriptWritingSopSystemAugment(): string {
  return `
SCRIPT WRITING SOP (reference-driven faceless YouTube mode):
You are an expert faceless YouTube scriptwriter. When a REFERENCE SCRIPT is supplied, silently complete all three SOP steps inside your reasoning — output JSON only, never expose the analysis.

Step 1 — Analyze the reference (internal):
- Writing style: tone, pacing, detail level, word choice, narrator voice
- Structure: hook, timeline, segments, transitions
- Sentence/paragraph style: length, clarity, retention rhythm
- Engagement for older / general audiences (accessible, not juvenile)
- Curiosity without clickbait — specific teases, no empty hype

Step 2 — Retention blueprint (internal):
- Tease a later payoff early; do not dump the conclusion in the opening
- Reset attention on a fixed cadence (see user prompt for interval)
- Use simple metaphors where they clarify — avoid jargon dumps
- Plain English; explain concepts simply without talking down
- Open loops, micro-reveals, and "but here's what most people miss" beats

Step 3 — Write the new script:
- Match the reference's style and structure — same narrator personality, not a copy-paste
- Topic comes from the user brief; facts must fit the topic (use training knowledge — no live web search)
- When DEEP RESEARCH CONTEXT is supplied, mine rare facts, viral hooks, and metaphors from it — same priority as reference style
- Honor word-count targets for the requested duration
- Still obey Mugtee JSON output format, scene beats, and creator-native retention rules
`.trim()
}

function buildRetentionTricksSection(durationSec: number): string {
  const { min, max } = attentionResetIntervalSec(durationSec)
  const scaledNote =
    durationSec <= 60
      ? `Quick Cut reel (${durationSec}s max): compress retention resets to every ${min}–${max}s — micro-hooks, pattern interrupts, and one strong payoff before the CTA.`
      : `Long-form: reset attention every ${min}–${max}s with teases, stakes shifts, or "wait until you hear this" bridges.`

  return [
    'RETENTION TRICKS (mandatory in the new script):',
    `- ${scaledNote}`,
    '- Tease a specific later payoff in the first 15% — never reveal the full conclusion early',
    '- Simple metaphors > abstract jargon; explain like a smart friend, not a textbook',
    '- Curiosity gaps: concrete details, not clickbait ("you won\'t believe" / "shocking truth")',
    '- Accessible English — clear for older viewers and non-native speakers',
    '- Vary sentence length; short punches after longer setup lines',
  ].join('\n')
}

/** User-prompt section appended when referenceScript is present. */
export function buildScriptWritingSopUserSection(input: ScriptWritingSopInput): string {
  const wordTarget = durationToWordCountTarget(input.durationSec)
  const platform = input.platform?.trim() || 'vertical short-form'

  return [
    '═══ REFERENCE SCRIPT SOP — STYLE MATCHING ═══',
    `NEW TOPIC / TITLE: "${input.topic}"`,
    `PLATFORM: ${platform}`,
    `DURATION: ${input.durationSec}s`,
    `WORD COUNT TARGET: ${wordTarget.min}–${wordTarget.max} words (${wordTarget.label})`,
    '',
    'REFERENCE SCRIPT (analyze style + structure internally, then write a NEW script on the topic above):',
    '---',
    input.referenceScript,
    '---',
    '',
    buildRetentionTricksSection(input.durationSec),
    '',
    'WRITING RULES:',
    '- Mirror reference tone, pacing, segment flow, and narrator voice — new facts for the new topic',
    '- Do NOT plagiarize sentences; emulate craft, not wording',
    '- Hook must match reference energy while being specific to the new topic',
    '- Script field must hit the word-count band and fit scene durations',
    '- If reference is long-form but duration is short, compress structure — keep the same voice',
  ].join('\n')
}
