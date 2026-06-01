import type { ContentBrief, ContentBriefInput } from '@/lib/content-director/content-brief'
import { normalizeContentBrief } from '@/lib/content-director/content-brief'
import { rulesBasedContentBrief } from '@/lib/content-director/rules-content-brief'
import type { CreativeDirectorBrief } from '@/lib/pipeline/v3-types'
import type { ParsedCreatorIntent } from '@/lib/input-understanding'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'

const RETENTION_STRATEGIES = [
  'Open loop in first 2s — payoff withheld until scene 3',
  'Pattern interrupt every 8–12s with visual or tonal shift',
  'Escalating stakes — each beat raises the cost of leaving',
  'Contrast cut — luxury vs loss, before vs after',
  'Question cascade — three unanswered hooks before reveal',
  'Emotional anchor — one human detail viewers must see resolved',
] as const

const PACING_STYLES = [
  'slow-burn documentary',
  'rapid-fire montage',
  'breathing room cinematic',
  'pulse-drop rhythm',
  'tension-release waves',
] as const

const NARRATIVE_ANGLES = [
  'insider revelation',
  'forbidden knowledge',
  'underdog transformation',
  'hidden cost of success',
  'parallel lives contrast',
  'single-object mystery',
] as const

function clip(value: string, max: number): string {
  const t = value.trim()
  return t.length > max ? t.slice(0, max) : t
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function pickUnique<T extends string>(
  pool: readonly T[],
  seed: string,
  avoid: string[] = []
): T {
  const h = hashSeed(seed)
  const filtered = pool.filter((item) => !avoid.some((a) => a.toLowerCase() === item.toLowerCase()))
  const list = filtered.length > 0 ? filtered : pool
  return list[h % list.length]!
}

function buildUniquenessToken(seed: string): string {
  const h = hashSeed(`${seed}-${Date.now()}`)
  return `v3-${h.toString(36)}-${Date.now().toString(36).slice(-4)}`
}

export type GenerateCreativeDirectorInput = ContentBriefInput & {
  parsedIntent?: ParsedCreatorIntent | null
  sessionSeed?: string
  previousHooks?: string[]
  title?: string
  hook?: string
}

export type GenerateCreativeDirectorResult = {
  brief: CreativeDirectorBrief
  source: 'rules' | 'ai'
  durationMs: number
}

function rulesCreativeDirectorBrief(
  input: GenerateCreativeDirectorInput
): CreativeDirectorBrief {
  const contentBrief = rulesBasedContentBrief(input, input.parsedIntent)
  const seed = input.sessionSeed ?? `${contentBrief.topic}-${Date.now()}`
  const runId = buildUniquenessToken(seed)

  const narrativeAngle = pickUnique(NARRATIVE_ANGLES, `${seed}-angle`)
  const retentionStrategy = pickUnique(RETENTION_STRATEGIES, `${seed}-retention`)
  const pacingStyle = pickUnique(PACING_STYLES, `${seed}-pacing`)

  const hook =
    input.hook?.trim() ||
    `What if ${contentBrief.topic.slice(0, 80)} — and nobody told you the real story?`
  const title =
    input.title?.trim() ||
    contentBrief.topic.slice(0, 60) ||
    'Untitled cinematic reel'

  return {
    runId,
    hook: clip(hook, 280),
    title: clip(title, 120),
    narrativeAngle,
    audience: contentBrief.audience,
    emotionalTone: contentBrief.emotionalAngle || contentBrief.tone,
    retentionStrategy,
    visualStyle: contentBrief.tone,
    pacingStyle,
    contentBrief,
    uniquenessToken: runId,
  }
}

/** Sync rules-only brief — safe for client store (no API keys). */
export function generateRulesCreativeDirectorBriefSync(
  input: GenerateCreativeDirectorInput
): GenerateCreativeDirectorResult {
  const started = performance.now()
  return {
    brief: rulesCreativeDirectorBrief(input),
    source: 'rules',
    durationMs: Math.round(performance.now() - started),
  }
}

async function aiEnhanceCreativeDirector(
  base: CreativeDirectorBrief,
  input: GenerateCreativeDirectorInput
): Promise<CreativeDirectorBrief> {
  if (!process.env.OPENAI_API_KEY?.trim()) return base

  const avoidHooks = (input.previousHooks ?? []).slice(0, 5).join('\n- ')

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are a cinematic creative director for short-form video.',
            'Return JSON only with keys: hook, title, narrativeAngle, audience, emotionalTone, retentionStrategy, visualStyle, pacingStyle.',
            'Every run must feel fresh — avoid clichés and template phrasing.',
            'Hook must be scroll-stopping and distinct from any previous hooks listed.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Topic: ${base.contentBrief.topic}`,
            `Core narrative: ${base.contentBrief.coreNarrative}`,
            `Tone: ${base.contentBrief.tone}`,
            `Niche: ${input.niche ?? 'general'}`,
            `Duration: ${input.duration ?? 60}s`,
            avoidHooks ? `Avoid repeating these hooks:\n- ${avoidHooks}` : '',
            `Uniqueness token (vary approach): ${base.uniquenessToken}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const json = JSON.parse(raw) as Record<string, unknown>
    const mergedContent = normalizeContentBrief({
      ...base.contentBrief,
      topic: base.contentBrief.topic,
      audience: json.audience ?? base.contentBrief.audience,
      tone: json.visualStyle ?? base.contentBrief.tone,
      emotionalAngle: json.emotionalTone ?? base.contentBrief.emotionalAngle,
      coreNarrative: base.contentBrief.coreNarrative,
    })

    return {
      ...base,
      hook: clip(String(json.hook ?? base.hook), 280),
      title: clip(String(json.title ?? base.title), 120),
      narrativeAngle: clip(String(json.narrativeAngle ?? base.narrativeAngle), 120),
      audience: clip(String(json.audience ?? base.audience), 180),
      emotionalTone: clip(String(json.emotionalTone ?? base.emotionalTone), 120),
      retentionStrategy: clip(String(json.retentionStrategy ?? base.retentionStrategy), 200),
      visualStyle: clip(String(json.visualStyle ?? base.visualStyle), 80),
      pacingStyle: clip(String(json.pacingStyle ?? base.pacingStyle), 80),
      contentBrief: mergedContent ?? base.contentBrief,
    }
  } catch {
    return base
  }
}

function creativeDirectorLlmEnabled(): boolean {
  return process.env.CONTENT_BRIEF_LLM === 'true' || process.env.MUGTEE_V3_CREATIVE_LLM === 'true'
}

/** Generate full CreativeDirectorBrief — rules first, optional LLM pass for uniqueness. */
export async function generateCreativeDirectorBrief(
  input: GenerateCreativeDirectorInput,
  options?: { useAi?: boolean }
): Promise<GenerateCreativeDirectorResult> {
  const started = performance.now()
  const rules = rulesCreativeDirectorBrief(input)
  const useAi = options?.useAi ?? creativeDirectorLlmEnabled()

  if (!useAi) {
    return {
      brief: rules,
      source: 'rules',
      durationMs: Math.round(performance.now() - started),
    }
  }

  const enhanced = await aiEnhanceCreativeDirector(rules, input)
  return {
    brief: enhanced,
    source: process.env.OPENAI_API_KEY?.trim() ? 'ai' : 'rules',
    durationMs: Math.round(performance.now() - started),
  }
}

/** Format brief for downstream generation prompts. */
export function formatCreativeDirectorForPrompt(brief: CreativeDirectorBrief): string {
  return [
    'CREATIVE DIRECTOR BRIEF (V3 — unique run):',
    `Title: ${brief.title}`,
    `Hook: ${brief.hook}`,
    `Narrative angle: ${brief.narrativeAngle}`,
    `Audience: ${brief.audience}`,
    `Emotional tone: ${brief.emotionalTone}`,
    `Retention strategy: ${brief.retentionStrategy}`,
    `Visual style: ${brief.visualStyle}`,
    `Pacing: ${brief.pacingStyle}`,
    `Run ID: ${brief.uniquenessToken}`,
  ].join('\n')
}
