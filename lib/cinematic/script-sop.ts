/**
 * Mugtee Script SOP — reel-native cinematic beats, schema, validation, and compliance scoring.
 */

import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { isGenericPayoffOrCta, isQuoteModeText } from '@/lib/cinematic/viral-structure'

/** Reel-native beat count range (voiceover-ready, documentary style). */
export const SCRIPT_BEAT_MIN = 8
export const SCRIPT_BEAT_MAX = 12
export const HOOK_MAX_WORDS = 20
export const BEAT_DURATION_MIN_SEC = 3
export const BEAT_DURATION_MAX_SEC = 8

/** Canonical six-phase Mugtee Script SOP (legacy — mapped from beats when needed). */
export const MUGTEE_SCRIPT_SOP_PHASES = [
  'Hook',
  'Context Setup',
  'Escalation',
  'Insight/Reveal',
  'Payoff',
  'CTA',
] as const

export type MugteeScriptSopPhase = (typeof MUGTEE_SCRIPT_SOP_PHASES)[number]

import { CREATOR_RETENTION_SCENE_COUNT } from '@/lib/cinematic/viral-structure'

export const MUGTEE_SCRIPT_SECTION_COUNT = CREATOR_RETENTION_SCENE_COUNT

/** Primary reel-native beat — one sentence, timed, emotional. */
export type MugteeScriptBeat = {
  narration: string
  duration: string
  emotion: string
}

/** Legacy phased section — kept for backward compat and downstream mapping. */
export type MugteeScriptSection = {
  phase: MugteeScriptSopPhase
  narration: string
  emotion: string
  visual_intent: string
}

export type MugteeScriptLlmPayload = {
  title?: string
  hook: string
  scriptBeats: MugteeScriptBeat[]
  payoff: string
  cta: string
  /** @deprecated Legacy — parsed when scriptBeats absent */
  script_sections?: MugteeScriptSection[]
  summary?: string
  hookVariations?: string[]
  scenes?: unknown[]
  captions?: unknown
  suggestedVoiceStyle?: string
}

export type ScriptSopScoreDimension =
  | 'hookQuality'
  | 'pacing'
  | 'emotion'
  | 'visualReadiness'
  | 'retentionPotential'

export type ScriptSopComplianceScore = {
  hookQuality: number
  pacing: number
  emotion: number
  visualReadiness: number
  retentionPotential: number
  overall: number
  issues: string[]
}

export type ScriptSopValidationResult = {
  valid: boolean
  issues: string[]
}

const PHASE_ALIASES: Record<string, MugteeScriptSopPhase> = {
  hook: 'Hook',
  'context setup': 'Context Setup',
  context: 'Context Setup',
  setup: 'Context Setup',
  escalation: 'Escalation',
  'insight/reveal': 'Insight/Reveal',
  'insight reveal': 'Insight/Reveal',
  insight: 'Insight/Reveal',
  reveal: 'Insight/Reveal',
  payoff: 'Payoff',
  cta: 'CTA',
  problem: 'Context Setup',
  empathy: 'Escalation',
  solution: 'Insight/Reveal',
  proof: 'Insight/Reveal',
}

const ESSAY_PATTERNS = [
  /\b(furthermore|moreover|in conclusion|to summarize|firstly|secondly|thirdly)\b/i,
  /\b(this article|this essay|let me explain|as mentioned above)\b/i,
  /\b(here are \d+ (tips|ways|steps|reasons))\b/i,
  /\b(the importance of|understanding the concept)\b/i,
]

const ROBOTIC_PATTERNS = [
  /\b(delve|tapestry|landscape|unlock the power|game.?changer|paradigm)\b/i,
  /\b(in today's (fast-paced|digital) world)\b/i,
  /\b(it is (important|essential|crucial) to note)\b/i,
]

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
}

function coerceSectionText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  const t = raw.trim()
  return t.length > max ? t.slice(0, max) : t
}

/** Parse duration string like "4s" or "6" into seconds. */
export function parseBeatDurationSec(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw)
  }
  if (typeof raw !== 'string') return null
  const m = raw.trim().match(/^(\d+)\s*s?$/i)
  return m ? Number(m[1]) : null
}

function normalizeDurationLabel(sec: number): string {
  return `${Math.max(BEAT_DURATION_MIN_SEC, Math.min(BEAT_DURATION_MAX_SEC, sec))}s`
}

/** Parse LLM scriptBeats array. */
export function parseScriptBeats(raw: unknown): MugteeScriptBeat[] {
  if (!Array.isArray(raw)) return []
  const beats: MugteeScriptBeat[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const narration = coerceSectionText(
      row.narration ?? row.text ?? row.description,
      400
    )
    if (!narration) continue
    const durSec =
      parseBeatDurationSec(row.duration) ??
      parseBeatDurationSec(row.durationSec) ??
      4
    beats.push({
      narration,
      duration: normalizeDurationLabel(durSec),
      emotion: coerceSectionText(row.emotion ?? row.emotionalGoal, 80),
    })
  }

  return beats
}

export function scriptTextFromBeats(
  hook: string,
  beats: MugteeScriptBeat[],
  payoff: string,
  cta: string
): string {
  const lines: string[] = []
  if (hook.trim()) lines.push(`[HOOK] ${hook.trim()}`)
  beats.forEach((b, i) => {
    if (b.narration.trim()) {
      lines.push(`[BEAT ${i + 1}] ${b.narration.trim()}`)
    }
  })
  if (payoff.trim()) lines.push(`[PAYOFF] ${payoff.trim()}`)
  if (cta.trim()) lines.push(`[CTA] ${cta.trim()}`)
  return lines.join('\n\n').trim()
}

export function beatsComplete(beats: MugteeScriptBeat[]): boolean {
  const filled = beats.filter((b) => b.narration.trim().length >= 8)
  return filled.length >= SCRIPT_BEAT_MIN && filled.length <= SCRIPT_BEAT_MAX
}

function hasEssayVoice(blob: string): boolean {
  const paragraphs = blob.split(/\n\s*\n/).filter((p) => p.trim())
  const longPara = paragraphs.some((p) => wordCount(p) > 55)
  const longSentences =
    blob.split(/[.!?]+/).filter((s) => wordCount(s) > 28).length >= 2
  return (
    ESSAY_PATTERNS.some((p) => p.test(blob)) ||
    ROBOTIC_PATTERNS.some((p) => p.test(blob)) ||
    longPara ||
    longSentences
  )
}

/** Validate reel-native scriptBeats structure — hard reject triggers regen. */
export function validateScriptBeatsStructure(input: {
  hook: string
  beats: MugteeScriptBeat[]
  payoff: string
  cta: string
  topic?: string
}): ScriptSopValidationResult {
  const issues: string[] = []
  const hook = input.hook.trim()

  if (!hook) issues.push('missing_hook')
  if (hook && wordCount(hook) > HOOK_MAX_WORDS) issues.push('hook_too_long')

  if (!input.beats.length) issues.push('missing_script_beats')
  if (input.beats.length > 0 && input.beats.length < SCRIPT_BEAT_MIN) {
    issues.push('incomplete_script_beats')
  }
  if (input.beats.length > SCRIPT_BEAT_MAX) issues.push('too_many_script_beats')

  for (const beat of input.beats) {
    if (!beat.duration?.trim()) {
      issues.push('missing_beat_duration')
      break
    }
    const durSec = parseBeatDurationSec(beat.duration)
    if (durSec == null || durSec < BEAT_DURATION_MIN_SEC || durSec > BEAT_DURATION_MAX_SEC) {
      issues.push('invalid_beat_duration')
    }
    if (sentenceCount(beat.narration) > 2) {
      issues.push('beat_too_many_sentences')
    }
  }

  if (!input.payoff.trim() || input.payoff.trim().length < 6) issues.push('missing_payoff')
  if (!input.cta.trim() || input.cta.trim().length < 4) issues.push('missing_cta')
  if (isGenericPayoffOrCta(input.payoff, input.topic)) issues.push('generic_payoff')
  if (isGenericPayoffOrCta(input.cta, input.topic)) issues.push('generic_cta')

  const narrations = input.beats.map((b) => b.narration).join('\n')
  if (hasEssayVoice(`${hook}\n${narrations}`)) issues.push('essay_or_robotic_voice')

  const missingEmotion = input.beats.filter(
    (b) => b.narration.trim() && !b.emotion.trim()
  ).length
  if (missingEmotion >= 3) issues.push('weak_emotion_labels')

  return { valid: issues.length === 0, issues: [...new Set(issues)] }
}

/** Map scriptBeats → legacy script_sections for downstream six-phase consumers. */
export function beatsToScriptSections(beats: MugteeScriptBeat[]): MugteeScriptSection[] {
  if (!beats.length) return []

  const phaseSlots: MugteeScriptSopPhase[] = [
    'Hook',
    'Context Setup',
    'Escalation',
    'Insight/Reveal',
    'Payoff',
    'CTA',
  ]
  const n = beats.length
  const indices = phaseSlots.map((_, i) =>
    Math.min(Math.floor((i * n) / phaseSlots.length), n - 1)
  )

  return phaseSlots.map((phase, i) => {
    const beat = beats[indices[i]]
    return {
      phase,
      narration: beat?.narration ?? '',
      emotion: beat?.emotion ?? '',
      visual_intent: beat?.narration ? `Film: ${beat.narration.slice(0, 120)}` : '',
    }
  })
}

function normalizePhase(raw: unknown): MugteeScriptSopPhase | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase()
  if (PHASE_ALIASES[key]) return PHASE_ALIASES[key]
  const exact = MUGTEE_SCRIPT_SOP_PHASES.find((p) => p.toLowerCase() === key)
  return exact ?? null
}

/** Parse and order LLM script_sections; fills missing phases with empty shells. */
export function parseScriptSections(raw: unknown): MugteeScriptSection[] {
  if (!Array.isArray(raw)) return []
  const byPhase = new Map<MugteeScriptSopPhase, MugteeScriptSection>()

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const phase = normalizePhase(row.phase ?? row.title ?? row.label)
    if (!phase) continue
    const narration = coerceSectionText(
      row.narration ?? row.description ?? row.text,
      600
    )
    if (!narration) continue
    byPhase.set(phase, {
      phase,
      narration,
      emotion: coerceSectionText(row.emotion ?? row.emotionalGoal, 80),
      visual_intent: coerceSectionText(
        row.visual_intent ?? row.visualIntent ?? row.visual,
        280
      ),
    })
  }

  return MUGTEE_SCRIPT_SOP_PHASES.map((phase) => {
    const existing = byPhase.get(phase)
    if (existing) return existing
    return { phase, narration: '', emotion: '', visual_intent: '' }
  })
}

export function scriptTextFromSections(sections: MugteeScriptSection[]): string {
  return sections
    .filter((s) => s.narration.trim())
    .map((s) => `[${s.phase}] ${s.narration.trim()}`)
    .join('\n\n')
    .trim()
}

export function sectionsComplete(sections: MugteeScriptSection[]): boolean {
  const filled = sections.filter((s) => s.narration.trim().length >= 12)
  return filled.length >= MUGTEE_SCRIPT_SECTION_COUNT
}

function scoreHookQuality(hook: string): number {
  let score = 40
  const h = hook.trim()
  const words = wordCount(h)
  if (words >= 6 && words <= HOOK_MAX_WORDS) score += 20
  if (words > HOOK_MAX_WORDS) score -= 30
  if (/[?!]/.test(h)) score += 8
  if (/\b(you|your|why|what if|nobody|secret|mistake)\b/i.test(h)) score += 12
  if (/^(in a world|hey guys|welcome back|let's talk)/i.test(h)) score -= 25
  if (isQuoteModeText(h)) score -= 20
  return clampScore(score)
}

function scoreBeatPacing(beats: MugteeScriptBeat[]): number {
  const narrations = beats.map((b) => b.narration.trim()).filter(Boolean)
  if (!narrations.length) return 0
  let score = 50
  const wordCounts = narrations.map(wordCount)
  const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
  if (avg >= 6 && avg <= 22) score += 25
  if (avg > 30) score -= 25
  const allShortBeats = narrations.every((n) => wordCount(n) <= 28)
  if (allShortBeats) score += 15
  const blob = narrations.join('\n')
  if (hasEssayVoice(blob)) score -= 35
  if (beats.length >= SCRIPT_BEAT_MIN && beats.length <= SCRIPT_BEAT_MAX) score += 15
  const withValidDur = beats.filter((b) => {
    const sec = parseBeatDurationSec(b.duration)
    return sec != null && sec >= BEAT_DURATION_MIN_SEC && sec <= BEAT_DURATION_MAX_SEC
  }).length
  score += Math.min(withValidDur * 2, 16)
  return clampScore(score)
}

function scoreBeatEmotion(beats: MugteeScriptBeat[]): number {
  let score = 35
  const withEmotion = beats.filter((b) => b.emotion.trim().length >= 3)
  score += withEmotion.length * 6
  const distinct = new Set(withEmotion.map((b) => b.emotion.toLowerCase()))
  if (distinct.size >= 4) score += 15
  if (distinct.size >= 6) score += 8
  const repeated =
    withEmotion.length >= 4 &&
    distinct.size <= Math.max(2, Math.floor(withEmotion.length / 3))
  if (repeated) score -= 12
  return clampScore(score)
}

function scoreBeatRetention(
  beats: MugteeScriptBeat[],
  hook: string,
  payoff: string
): number {
  let score = 45
  if (hook.length >= 10) score += 10
  const mid = beats[Math.floor(beats.length / 2)]?.narration ?? ''
  const late = beats[Math.floor(beats.length * 0.75)]?.narration ?? ''
  if (mid.length >= 10) score += 12
  if (late.length >= 10) score += 15
  if (payoff.trim().length >= 6) score += 12
  const earlyReveal =
    /(the answer is|here's the truth|spoiler|in short)/i.test(hook) &&
    late.length < 20
  if (earlyReveal) score -= 20
  if (/\b(wait until|but here's|what most people miss|before you)\b/i.test(`${hook} ${mid}`)) {
    score += 10
  }
  return clampScore(score)
}

export function scoreScriptBeatsCompliance(input: {
  hook: string
  beats: MugteeScriptBeat[]
  payoff: string
  cta: string
  topic?: string
}): ScriptSopComplianceScore {
  const structure = validateScriptBeatsStructure(input)
  const issues = [...structure.issues]

  const hookQuality = scoreHookQuality(input.hook)
  const pacing = scoreBeatPacing(input.beats)
  const emotion = scoreBeatEmotion(input.beats)
  const visualReadiness = clampScore(
    50 + Math.min(input.beats.length * 4, 40)
  )
  const retentionPotential = scoreBeatRetention(
    input.beats,
    input.hook,
    input.payoff
  )

  const overall = clampScore(
    (hookQuality + pacing + emotion + visualReadiness + retentionPotential) / 5
  )

  return {
    hookQuality,
    pacing,
    emotion,
    visualReadiness,
    retentionPotential,
    overall,
    issues,
  }
}

/** @deprecated Legacy section validation — use validateScriptBeatsStructure. */
export function validateScriptSopStructure(
  sections: MugteeScriptSection[],
  hook: string,
  payoff: string,
  cta: string
): ScriptSopValidationResult {
  const beats = sections
    .filter((s) => s.narration.trim())
    .map((s) => ({
      narration: s.narration,
      duration: '4s',
      emotion: s.emotion,
    }))
  return validateScriptBeatsStructure({ hook, beats, payoff, cta })
}

export function scoreScriptSopCompliance(input: {
  hook: string
  sections: MugteeScriptSection[]
  payoff: string
  cta: string
  topic?: string
}): ScriptSopComplianceScore {
  const beats = input.sections
    .filter((s) => s.narration.trim())
    .map((s) => ({
      narration: s.narration,
      duration: '4s',
      emotion: s.emotion,
    }))
  return scoreScriptBeatsCompliance({
    hook: input.hook,
    beats,
    payoff: input.payoff,
    cta: input.cta,
    topic: input.topic,
  })
}

export function scoreCinematicOutputSop(
  output: CinematicGenerationOutput,
  scriptTopic?: string
): ScriptSopComplianceScore {
  if (output.scriptBeats?.length) {
    return scoreScriptBeatsCompliance({
      hook: output.hook,
      beats: output.scriptBeats,
      payoff: output.payoff ?? '',
      cta: output.cta ?? output.captionPack?.cta ?? '',
      topic: scriptTopic,
    })
  }

  const sections =
    output.scriptSections?.length === MUGTEE_SCRIPT_SECTION_COUNT
      ? output.scriptSections
      : parseScriptSections(
          output.scenes.map((s) => ({
            phase: s.title,
            narration: s.description,
            emotion: '',
            visual_intent: s.visualPrompt || s.imagePrompt || '',
          }))
        )

  return scoreScriptSopCompliance({
    hook: output.hook,
    sections,
    payoff: output.payoff || sections[4]?.narration || '',
    cta: output.cta || output.captionPack?.cta || sections[5]?.narration || '',
    topic: scriptTopic,
  })
}

export function scriptSopMinScore(): number {
  const raw = process.env.SCRIPT_SOP_MIN_SCORE
  const n = raw ? Number(raw) : 80
  return Number.isFinite(n) ? clampScore(n) : 80
}

export function scriptSopMaxRetries(): number {
  const raw = process.env.SCRIPT_SOP_MAX_RETRIES
  const fallback = process.env.VERCEL === '1' ? 1 : 2
  const n = raw ? Number(raw) : fallback
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 5) : fallback
}

export function buildSopRetryNote(
  score: ScriptSopComplianceScore,
  _niche: CinematicNiche
): string {
  const weak: string[] = []
  if (score.hookQuality < 80) weak.push('hook (max 20 words, pattern interrupt)')
  if (score.pacing < 80) weak.push('pacing (8–12 beats, 3–8s each, one sentence per beat)')
  if (score.emotion < 80) weak.push('emotion label on every beat')
  if (score.retentionPotential < 80) {
    weak.push('retention (tease early, reveal late, land payoff)')
  }
  const structural = score.issues.filter((i) =>
    [
      'missing_script_beats',
      'incomplete_script_beats',
      'missing_hook',
      'hook_too_long',
      'missing_beat_duration',
      'beat_too_many_sentences',
      'essay_or_robotic_voice',
      'generic_payoff',
      'generic_cta',
    ].includes(i)
  )
  return [
    `SOP compliance ${score.overall}/100 (need ${scriptSopMinScore()}+).`,
    weak.length ? `Strengthen: ${weak.join('; ')}.` : '',
    structural.length ? `Fix structure: ${structural.join(', ')}.` : '',
    score.issues.includes('generic_payoff') || score.issues.includes('generic_cta')
      ? 'Write topic-specific payoff + CTA — name the brief, ban generic "save and try step one" lines.'
      : '',
    'Output Mugtee JSON: { hook, scriptBeats[{narration,duration,emotion}]×8-12, payoff, cta, scenes, captions }.',
    'NO blog/essay/GPT tone. YES reel-native one-sentence beats with duration badges.',
  ]
    .filter(Boolean)
    .join(' ')
}

