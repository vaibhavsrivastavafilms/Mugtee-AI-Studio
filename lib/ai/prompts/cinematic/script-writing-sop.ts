/**
 * Mugtee Script SOP — reel-native cinematic script generation (always-on).
 * Reference-script mode adds style-matching on top of the beats structure.
 */

import {
  SCRIPT_BEAT_MIN,
  SCRIPT_BEAT_MAX,
  HOOK_MAX_WORDS,
  BEAT_DURATION_MIN_SEC,
  BEAT_DURATION_MAX_SEC,
} from '@/lib/cinematic/script-sop'
import type { SelectedScriptArchetype } from '@/lib/cinematic/script-archetypes'
import { buildBannedScriptPhrasesSection } from '@/lib/cinematic/narrative-structure-engine'

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
    return { min: 90, max: 160, label: `${durationSec}s short-form reel` }
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

/** Attention-reset cadence — scaled for Quick Cut (60s) vs long-form. */
export function attentionResetIntervalSec(durationSec: number): { min: number; max: number } {
  if (durationSec <= 60) {
    return { min: 8, max: 15 }
  }
  return { min: 20, max: 40 }
}

/** Soft word-count hint for all scripts. */
export function scriptWordCountHint(durationSec: number): string {
  const { min, max, label } = durationToWordCountTarget(durationSec)
  return `Target spoken length: ${min}–${max} words (${label}). ${SCRIPT_BEAT_MIN}–${SCRIPT_BEAT_MAX} one-sentence beats — not paragraphs.`
}

/** Always applied — Mugtee Script SOP system augment. */
export function buildMugteeScriptSopSystemAugment(
  scriptArchetype?: SelectedScriptArchetype
): string {
  const emotionHint = scriptArchetype
    ? `emotion: archetype-native label (e.g. ${scriptArchetype.emotionExamples.slice(0, 5).join(', ')}) — NOT a fixed curiosity/tension/shock/hope sequence`
    : 'emotion: one label per beat — vary across the arc, not a repeated template'

  return `
MUGTEE SCRIPT SOP (mandatory — reel-native cinematic beats, NOT essays):
${scriptArchetype ? `\nACTIVE NARRATIVE ARCHETYPE: ${scriptArchetype.label} — use its named scene labels, not generic CTSH beats.\n` : ''}
OUTPUT STRUCTURE:
HOOK (max ${HOOK_MAX_WORDS} words, single powerful opening line)

SCRIPT BEATS (${SCRIPT_BEAT_MIN}–${SCRIPT_BEAT_MAX} beats):
Each beat: { label, narration, duration, emotion }
- label: mandatory scene label from narrative structure (NOT "Beat 1", "Problem", "Solution")
- narration: exactly ONE sentence, voiceover-ready, documentary style
- duration: "${BEAT_DURATION_MIN_SEC}s"–"${BEAT_DURATION_MAX_SEC}s" per beat (e.g. "4s")
- ${emotionHint}

PAYOFF: single emotional landing line — must name the specific topic/outcome (never generic "take one small step" / "witness the change")
CTA: short creator CTA tied to this topic (save, comment, try a concrete move — never "save this and try step one today")

${buildBannedScriptPhrasesSection()}

Voice rules:
- Reel-native: short sentences, emotional pacing, visual storytelling
- NO paragraphs, NO multi-sentence beats, NO blog/essay/GPT tone
- Banned: "furthermore/in conclusion", numbered lists, robotic corporate tone, quote spam

Required JSON shape (primary):
{
  "title": string (optional — derive from hook if omitted),
  "hook": string,
  "scriptBeats": [{ "label", "narration", "duration", "emotion" }] × ${SCRIPT_BEAT_MIN}–${SCRIPT_BEAT_MAX},
  "payoff": string,
  "cta": string,
  "summary": string,
  "hookVariations": string[3],
  "scenes": [{ "id", "title", "description", "duration", ...visual fields }],
  "captions": { "primary", "cta", "hashtags" },
  "suggestedVoiceStyle": string${scriptArchetype ? `,\n  "narrativeArchetype": "${scriptArchetype.id}",\n  "narrativeArchetypeLabel": "${scriptArchetype.label}",\n  "narrativeStructureLabels": ${JSON.stringify([...scriptArchetype.sceneLabels])},\n  "narrativeFlowDisplay": "${scriptArchetype.sceneLabels.join(' → ')}"` : ''}
}

Also populate "scenes" (one per beat) from scriptBeats — title = beat label, description = narration, numeric duration from beat.
`.trim()
}

/** @deprecated Use buildMugteeScriptSopSystemAugment — kept for imports. */
export function buildScriptWritingSopSystemAugment(
  scriptArchetype?: SelectedScriptArchetype
): string {
  return buildMugteeScriptSopSystemAugment(scriptArchetype)
}

function buildRetentionTricksSection(durationSec: number): string {
  const { min, max } = attentionResetIntervalSec(durationSec)
  const scaledNote =
    durationSec <= 60
      ? `Quick Cut reel (${durationSec}s): micro-resets every ${min}–${max}s across beats — never dump the reveal in the Hook.`
      : `Long-form: reset attention every ${min}–${max}s with teases and stakes shifts.`

  return [
    'RETENTION (across beats):',
    `- ${scaledNote}`,
    '- Tease payoff before final beats — do not spoil the lesson in Hook',
    '- Concrete details > clickbait ("you won\'t believe" / "shocking truth")',
    '- Vary sentence length; punch after setup',
  ].join('\n')
}

/** User-prompt section when referenceScript is present (style matching). */
export function buildScriptWritingSopUserSection(input: ScriptWritingSopInput): string {
  const wordTarget = durationToWordCountTarget(input.durationSec)
  const platform = input.platform?.trim() || 'vertical short-form'

  return [
    '═══ REFERENCE SCRIPT — STYLE MATCH (same Mugtee beats structure) ═══',
    `NEW TOPIC: "${input.topic}"`,
    `PLATFORM: ${platform}`,
    `DURATION: ${input.durationSec}s`,
    `WORD COUNT (total narration): ${wordTarget.min}–${wordTarget.max}`,
    '',
    'REFERENCE SCRIPT (mirror tone/pacing/voice — new facts for new topic):',
    '---',
    input.referenceScript,
    '---',
    '',
    buildRetentionTricksSection(input.durationSec),
    '',
    `RULES: emulate craft not wording; ${SCRIPT_BEAT_MIN}–${SCRIPT_BEAT_MAX} one-sentence beats with duration; reel-native not essay.`,
  ].join('\n')
}

