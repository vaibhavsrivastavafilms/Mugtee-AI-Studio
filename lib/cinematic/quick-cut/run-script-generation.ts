import { getAnthropicClient, CLAUDE_SCRIPT_MODEL } from '@/lib/ai/anthropic-client'
import {
  allowAnthropicScript,
  allowOpenAIScript,
  FREE_OPENAI_CHAT_MODEL,
  hasDirectGeminiKey,
  isFreeTierOnly,
} from '@/lib/ai/free-tier'
import { generateScriptWithGemini } from '@/lib/ai/gemini-script'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildCinematicScriptPrompt,
} from '@/lib/ai/prompts/cinematic/build-prompt'
import {
  buildMugteeScriptSopSystemAugment,
  buildScriptWritingSopUserSection,
} from '@/lib/ai/prompts/cinematic/script-writing-sop'
import {
  buildSopRetryNote,
  scoreCinematicOutputSop,
  scriptSopMaxRetries,
  scriptSopMinScore,
} from '@/lib/cinematic/script-sop'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { buildVirloSystemPrompt } from '@/lib/virlo-engine/virlo-prompt'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import {
  mergeViralScript,
  runVirloScriptEngine,
  type VirloScriptBlueprint,
} from '@/lib/cinematic/virlo-script-engine'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import type { ViralStructureAnalysis } from '@/lib/cinematic/viral-structure'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  buildMockCinematicOutput,
  finalizeCinematicOutput,
  normalizeCinematicOutput,
  validateCinematicOutput,
  type CinematicGenerationOutput,
} from '@/lib/cinematic/generation'
import { type CinematicNiche } from '@/lib/cinematic/niches'
import { runDeepResearch } from '@/lib/cinematic/deep-research-engine'
import type {
  DeepResearchPipelineOptions,
  DeepResearchReport,
  ScriptGenerationResearchOutput,
} from '@/types/deep-research'
import type { StoryboardStoreFields } from '@/types/storyboard'
import { runStoryboardSop } from '@/lib/cinematic/storyboard-sop-engine'
import { coerceDuration, coercePlatform, coerceTone } from '@/lib/workspace/validation'
import type { CreatorMemoryBiasHints } from '@/lib/creator/creator-memory'

export type ScriptGenerationInput = {
  topic: string
  platform?: string
  tone?: string
  duration?: number
  niche?: string
  sessionSeed?: string | number
  language?: ProjectLanguage | string
  /** Raw voice transcript (Whisper / browser STT) */
  transcript?: string
  /** Optional voice presence note from canvas */
  voiceNote?: string
  /** Optional reference script — triggers faceless YouTube SOP style matching */
  referenceScript?: string
  /** Full project regen — fresh script, same locked context */
  regenFresh?: boolean
  topicChanged?: boolean
  previousTopic?: string
  previousScript?: string
  previousHook?: string
  visualStyle?: VisualStyle | null
  creatorMemoryBias?: CreatorMemoryBiasHints | null
  /** Hook from title step — avoids topic-template echo in script engine */
  hookSeed?: string
  /** Title from title step — optional LLM seed */
  titleSeed?: string
} & DeepResearchPipelineOptions

type GenInput = {
  topic: string
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
  sessionSeed?: string | number
  language: ProjectLanguage
  blueprint: VirloScriptBlueprint
  viralStructure: ViralStructureAnalysis
  referenceScript?: string
  researchDocument?: string
  researchReport?: DeepResearchReport
  regenFresh?: boolean
  topicChanged?: boolean
  previousTopic?: string
  previousScript?: string
  previousHook?: string
  lockedVisualStyle?: VisualStyle | null
  creatorMemoryBias?: CreatorMemoryBiasHints | null
  titleSeed?: string
}

function buildSystemPrompt(): string {
  return `${buildVirloSystemPrompt()}\n\n${buildMugteeScriptSopSystemAugment()}`
}

function buildUserPrompt(input: GenInput, retryNote?: string): string {
  const sopSection = input.referenceScript
    ? buildScriptWritingSopUserSection({
        topic: input.topic,
        durationSec: input.duration,
        platform: input.platform,
        referenceScript: input.referenceScript,
      })
    : ''

  return [
    buildCinematicScriptPrompt({
      topic: input.topic,
      platform: input.platform,
      tone: input.tone,
      duration: input.duration,
      niche: input.niche,
      sessionSeed: input.sessionSeed,
      language: input.language,
      visualStyle: input.lockedVisualStyle ?? input.blueprint.visualStyle,
      virloHook: input.blueprint.hook,
      retentionPattern: input.blueprint.retention_pattern,
      viralStructure: input.viralStructure,
      regenFresh: input.regenFresh,
      topicChanged: input.topicChanged,
      previousTopic: input.previousTopic,
      previousScript: input.previousScript,
      previousHook: input.previousHook,
      creatorMemoryBias: input.creatorMemoryBias,
      researchDocument: input.researchDocument,
      researchReport: input.researchReport,
      titleSeed: input.titleSeed,
    }),
    sopSection,
    retryNote
      ? `\nRETRY NOTE: ${retryNote}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function hasUsableLlmScript(parsed: Record<string, unknown>, topic: string): boolean {
  const beats = Array.isArray(parsed.scriptBeats)
    ? parsed.scriptBeats
    : Array.isArray(parsed.script_beats)
      ? parsed.script_beats
      : []
  const beatNarration = beats
    .map((s) =>
      s && typeof s === 'object' && typeof (s as Record<string, unknown>).narration === 'string'
        ? ((s as Record<string, unknown>).narration as string).trim()
        : ''
    )
    .filter(Boolean)
    .join(' ')

  const sections = Array.isArray(parsed.script_sections)
    ? parsed.script_sections
    : Array.isArray(parsed.scriptSections)
      ? parsed.scriptSections
      : []
  const sectionNarration = sections
    .map((s) =>
      s && typeof s === 'object' && typeof (s as Record<string, unknown>).narration === 'string'
        ? ((s as Record<string, unknown>).narration as string).trim()
        : ''
    )
    .filter(Boolean)
    .join(' ')
  const script = typeof parsed.script === 'string' ? parsed.script.trim() : ''
  const body = beatNarration || sectionNarration || script
  if (body.length < 48) return false

  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : []
  if (beats.length >= 6 || sections.length >= 4 || scenes.length >= 2) return true

  const topicNorm = topic.trim().toLowerCase()
  if (!topicNorm) return true
  const scriptNorm = body.toLowerCase()
  if (scriptNorm === topicNorm) return false
  if (scriptNorm.startsWith(topicNorm) && body.length < topic.length + 24) return false

  const topicWords = topicNorm.split(/\s+/).filter((w) => w.length > 3)
  if (topicWords.length === 0) return true
  const matched = topicWords.filter((w) => scriptNorm.includes(w)).length
  if (matched / topicWords.length > 0.85 && body.split(/\s+/).length <= topicWords.length + 6) {
    return false
  }

  return true
}

function parseLlmJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    return {}
  }
}

async function generateWithClaude(
  userPrompt: string,
  systemPrompt: string,
  retryNote?: string
) {
  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: CLAUDE_SCRIPT_MODEL,
    max_tokens: 8192,
    temperature: retryNote ? 0.75 : 0.85,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  const content = textBlock && textBlock.type === 'text' ? textBlock.text : '{}'
  return parseLlmJson(content)
}

async function generateWithOpenAI(
  input: GenInput,
  userPrompt: string,
  systemPrompt: string,
  retryNote?: string
) {
  const openai = getOpenAIClient()
  console.log('[OPENAI] REQUEST START', { model: FREE_OPENAI_CHAT_MODEL, retry: Boolean(retryNote) })

  try {
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: retryNote ? 0.75 : 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content || '{}'
    console.log('[OPENAI] REQUEST SUCCESS')
    return parseLlmJson(content)
  } catch (error) {
    console.error('[OPENAI] REQUEST FAILED', error)
    throw error
  }
}

async function tryGeminiScript(
  userPrompt: string,
  systemPrompt: string,
  topic: string,
  retryNote?: string,
  errors?: string[]
): Promise<Record<string, unknown> | null> {
  const gemini = await generateScriptWithGemini({
    systemPrompt,
    userPrompt,
    temperature: retryNote ? 0.75 : 0.85,
  })
  if (gemini && hasUsableLlmScript(gemini, topic)) return gemini
  if (gemini && Object.keys(gemini).length > 0) errors?.push('gemini_echo_or_empty')
  else if (errors) errors.push('gemini_failed')
  return null
}

/** OpenAI → Claude → Gemini (Gemini first when free-tier-only). Throws when no provider succeeds. */
async function generateScript(input: GenInput, retryNote?: string) {
  const userPrompt = buildUserPrompt(input, retryNote)
  const systemPrompt = buildSystemPrompt()
  const errors: string[] = []
  const geminiFirst = isFreeTierOnly()
  console.log('[generate-script] provider order', {
    geminiFirst,
    openai: allowOpenAIScript(),
    anthropic: allowAnthropicScript(),
    gemini: hasDirectGeminiKey(),
  })

  const runGemini = () =>
    tryGeminiScript(userPrompt, systemPrompt, input.topic, retryNote, errors)

  if (geminiFirst) {
    const gemini = await runGemini()
    if (gemini) return gemini
  }

  if (allowOpenAIScript()) {
    try {
      const openai = await generateWithOpenAI(input, userPrompt, systemPrompt, retryNote)
      if (hasUsableLlmScript(openai, input.topic)) return openai
      errors.push('openai_echo_or_empty')
    } catch (err) {
      console.error('[OPENAI] REQUEST FAILED (script provider)', err)
      errors.push('openai_failed')
    }
  }

  if (allowAnthropicScript()) {
    try {
      const claude = await generateWithClaude(userPrompt, systemPrompt, retryNote)
      if (hasUsableLlmScript(claude, input.topic)) return claude
      errors.push('claude_echo_or_empty')
    } catch {
      errors.push('claude_failed')
    }
  }

  if (!geminiFirst) {
    const gemini = await runGemini()
    if (gemini) return gemini
  }

  throw new Error(
    errors.length > 0
      ? `No usable script from providers (${errors.join(', ')})`
      : 'No script generation provider configured'
  )
}

/** Shared script shaping used by Quick Cut orchestration and generate-script API. */
export type ScriptGenerationResult = {
  output: CinematicGenerationOutput
  mock: boolean
  reason?: string
  virlo?: VirloMetadata
  language: ProjectLanguage
  visualStyle: VisualStyle
  viralScript: ViralScript
  viralStructure: ViralStructureAnalysis
  sopCompliance?: import('@/lib/cinematic/script-sop').ScriptSopComplianceScore
  sopRegenAttempts?: number
} & ScriptGenerationResearchOutput &
  Partial<StoryboardStoreFields>

export async function runScriptGeneration(
  input: ScriptGenerationInput
): Promise<ScriptGenerationResult> {
  const topic = input.topic.trim()
  const platform = coercePlatform(input.platform)
  const tone = coerceTone(input.tone)
  const duration = coerceDuration(input.duration)
  const language = normalizeProjectLanguage(input.language, input.transcript || topic)

  let researchDocument = input.researchDocument?.trim() || undefined
  let researchReport = input.researchReport
  let researchMock = false
  if (!input.skipResearch && topic && !researchDocument) {
    const research = await runDeepResearch({ topic, language })
    researchDocument = research.document.trim() || undefined
    researchReport = research.report
    researchMock = research.mock
  }

  const blueprint = runVirloScriptEngine({
    topic,
    platform,
    tone,
    duration,
    niche: input.niche,
    sessionSeed: input.sessionSeed,
    language,
    transcript: input.transcript,
    voiceNote: input.voiceNote,
    hookSeed: input.hookSeed,
    visualStyle: input.visualStyle,
    researchReport,
  })
  const { niche, virloContext, virlo, viralStructure } = blueprint
  const resolvedVisualStyle = input.visualStyle ?? blueprint.visualStyle

  const referenceScript = input.referenceScript?.trim() || undefined

  const genInput: GenInput = {
    topic,
    platform,
    tone,
    duration,
    niche,
    sessionSeed: input.sessionSeed,
    language,
    blueprint,
    viralStructure,
    referenceScript,
    researchDocument,
    researchReport,
    regenFresh: input.regenFresh,
    topicChanged: input.topicChanged,
    previousTopic: input.previousTopic,
    previousScript: input.previousScript,
    previousHook: input.previousHook,
    lockedVisualStyle: input.visualStyle ?? blueprint.visualStyle,
    creatorMemoryBias: input.creatorMemoryBias,
    titleSeed: input.titleSeed,
  }

  if (!hasScriptGenerationKey()) {
    const output = buildMockCinematicOutput({
      topic,
      tone,
      duration,
      niche,
      virloContext,
      viralStructure,
    })
    const viralScript = mergeViralScript(blueprint, output.script, output.hook)
    return {
      output,
      mock: true,
      reason: 'missing_api_key',
      virlo,
      language,
      visualStyle: resolvedVisualStyle,
      viralScript,
      viralStructure,
      researchDocument,
      researchReport,
      researchMock,
    }
  }

  try {
    const minSopScore = scriptSopMinScore()
    const maxSopRetries = scriptSopMaxRetries()
    let sopRegenAttempts = 0
    let hookVariations: string[] = []
    let output: CinematicGenerationOutput | undefined
    let validation: ReturnType<typeof validateCinematicOutput> = {
      valid: false,
      issues: [],
    }
    let sopCompliance: ReturnType<typeof scoreCinematicOutputSop> = {
      hookQuality: 0,
      pacing: 0,
      emotion: 0,
      visualReadiness: 0,
      retentionPotential: 0,
      overall: 0,
      issues: [],
    }

    for (let attempt = 0; attempt <= maxSopRetries; attempt++) {
      let parsed: Record<string, unknown>
      if (attempt > 0) {
        sopRegenAttempts += 1
        const retryNote = !validation.valid
          ? validation.issues.join(', ')
          : buildSopRetryNote(sopCompliance, niche)
        parsed = await generateScript(genInput, retryNote)
      } else {
        parsed = await generateScript(genInput)
      }


      hookVariations = Array.isArray(parsed.hookVariations)
        ? parsed.hookVariations.filter((v): v is string => typeof v === 'string')
        : hookVariations

      output = finalizeCinematicOutput(
        normalizeCinematicOutput(parsed, {
          topic,
          duration,
          tone,
          niche,
          titleSeed: input.titleSeed,
        }),
        niche,
        { topic, duration, tone, hookVariations }
      )

      validation = validateCinematicOutput(output, niche, topic)
      sopCompliance = scoreCinematicOutputSop(output)

      const passesValidation = validation.valid
      const passesSop = sopCompliance.overall >= minSopScore
      if (passesValidation && passesSop) break
      if (attempt >= maxSopRetries) break
    }

    if (!output) {
      throw new Error('Script generation produced no output')
    }

    const viralScript = mergeViralScript(blueprint, output.script, output.hook)
    const storyboard = await runStoryboardSop(output.script, duration, {
      language,
      researchDocument,
      researchReport,
      retentionMode: duration <= 60,
    })
    return {
      output,
      mock: false,
      virlo,
      language,
      visualStyle: resolvedVisualStyle,
      viralScript,
      viralStructure,
      researchDocument,
      researchReport,
      researchMock,
      sopCompliance,
      sopRegenAttempts,
      ...(storyboard ?? {}),
    }
  } catch (err) {
    if (!hasScriptGenerationKey()) {
      const output = buildMockCinematicOutput({
        topic,
        tone,
        duration,
        niche,
        virloContext,
        viralStructure,
      })
      const viralScript = mergeViralScript(blueprint, output.script, output.hook)
      return {
        output,
        mock: true,
        reason: 'provider_fallback',
        virlo,
        language,
        visualStyle: resolvedVisualStyle,
        viralScript,
        viralStructure,
        researchDocument,
        researchReport,
        researchMock,
      }
    }
    throw err instanceof Error ? err : new Error('Script generation failed')
  }
}
