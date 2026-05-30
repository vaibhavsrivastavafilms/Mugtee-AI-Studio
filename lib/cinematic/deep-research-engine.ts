import { getAnthropicClient, CLAUDE_SCRIPT_MODEL } from '@/lib/ai/anthropic-client'
import {
  allowAnthropicScript,
  allowOpenAIScript,
  FREE_GEMINI_TEXT_MODEL,
  FREE_OPENAI_CHAT_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  getGeminiApiKey,
  hasDirectGeminiKey,
  isFreeTierOnly,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  DEFAULT_PERPLEXITY_RESEARCH_MODEL,
  hasPerplexityKey,
  perplexityChatCompletion,
} from '@/lib/ai/perplexity-client'
import {
  buildDeepResearchSopPrompt,
  buildDeepResearchSopSystemPrompt,
  buildMockDeepResearchReport,
  hasUsableDeepResearchReport,
  normalizeDeepResearchReport,
  serializeDeepResearchReport,
} from '@/lib/ai/prompts/youtube/deep-research-sop'
import {
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'
import { logError } from '@/lib/workspace/validation'
import type {
  DeepResearchDocument,
  DeepResearchInput,
  DeepResearchProvider,
  DeepResearchReport,
  DeepResearchResult,
  DeepResearchSections,
} from '@/types/deep-research'

const SYSTEM_PROMPT = buildDeepResearchSopSystemPrompt()

function parseLlmJson(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim())
      } catch {
        return null
      }
    }
    return null
  }
}

/** Derive legacy section buckets from a structured report. */
export function parseDeepResearchSections(report: DeepResearchReport): DeepResearchSections {
  return {
    coreExplanation: [
      report.overview.beginnerExplanation,
      report.overview.expertExplanation,
      report.overview.oneSentenceSummary,
      report.overview.whyItMatters,
    ].filter(Boolean),
    rareFacts: report.rareFacts.map((f) => f.fact),
    viralHooks: report.hookAngles.map((h) => h.hookLine).filter(Boolean),
    historicalContext: report.timeline.map((e) => `${e.year}: ${e.event}`),
    comparisonsMetaphors: report.metaphors.map((m) => `${m.metaphor} → ${m.explains}`),
    controversies: report.controversies.map((c) => c.claim),
    futurePredictions: report.futureImplications.map((f) => f.prediction),
  }
}

function finalizeResearch(
  report: DeepResearchReport,
  provider: DeepResearchProvider,
  topic: string,
  language: ProjectLanguage
): DeepResearchResult {
  return {
    topic,
    language,
    report,
    document: serializeDeepResearchReport(report),
    sections: parseDeepResearchSections(report),
    mock: false,
    provider,
  }
}

function buildMockDeepResearch(topic: string, language: ProjectLanguage): DeepResearchResult {
  const report = buildMockDeepResearchReport(topic)
  const label = languageLabel(language)
  const document = `${serializeDeepResearchReport(report)}\n\n_Mock research (${label}) — add PERPLEXITY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY for live output._`

  return {
    topic,
    language,
    report,
    document,
    sections: parseDeepResearchSections(report),
    mock: true,
    provider: 'mock',
    reason: 'missing_api_key',
  }
}

async function generateWithPerplexity(userPrompt: string): Promise<DeepResearchReport | null> {
  if (!hasPerplexityKey()) return null
  const model = DEFAULT_PERPLEXITY_RESEARCH_MODEL
  if (process.env.NODE_ENV === 'development') {
    console.log('[PERPLEXITY] REQUEST START', { model, step: 'deep-research' })
  }
  try {
    const content = await perplexityChatCompletion({
      model,
      temperature: 0.85,
      jsonObject: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })
    if (!content) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PERPLEXITY] REQUEST FAILED', { step: 'deep-research', error: 'empty_response' })
      }
      return null
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[PERPLEXITY] REQUEST SUCCESS', { step: 'deep-research' })
    }
    const parsed = parseLlmJson(content)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeDeepResearchReport(parsed, '')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[PERPLEXITY] REQUEST FAILED', { step: 'deep-research', error })
    }
    throw error
  }
}

async function generateWithOpenAI(userPrompt: string): Promise<DeepResearchReport | null> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[OPENAI] REQUEST START', { model: FREE_OPENAI_CHAT_MODEL, step: 'deep-research' })
  }
  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })
    const content = completion.choices[0]?.message?.content?.trim() || '{}'
    if (process.env.NODE_ENV === 'development') {
      console.log('[OPENAI] REQUEST SUCCESS', { step: 'deep-research' })
    }
    const parsed = parseLlmJson(content)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeDeepResearchReport(parsed, '')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OPENAI] REQUEST FAILED', { step: 'deep-research', error })
    }
    throw error
  }
}

async function generateWithAnthropic(userPrompt: string): Promise<DeepResearchReport | null> {
  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: CLAUDE_SCRIPT_MODEL,
    max_tokens: 16384,
    temperature: 0.85,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const textBlock = message.content.find((block) => block.type === 'text')
  const content = textBlock && textBlock.type === 'text' ? textBlock.text : '{}'
  const parsed = parseLlmJson(content)
  if (!parsed || typeof parsed !== 'object') return null
  return normalizeDeepResearchReport(parsed, '')
}

async function generateWithGemini(userPrompt: string): Promise<DeepResearchReport | null> {
  const key = getGeminiApiKey()
  if (!key || !hasDirectGeminiKey()) return null

  const model = FREE_GEMINI_TEXT_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `${userPrompt}\n\nReturn ONLY valid JSON.` }] }],
      generationConfig: {
        temperature: 0.85,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) return null

  const json = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') ?? ''
  const parsed = parseLlmJson(text.trim() || '{}')
  if (!parsed || typeof parsed !== 'object') return null
  return normalizeDeepResearchReport(parsed, '')
}

/** Build a full {@link DeepResearchDocument} from engine output. */
export function toDeepResearchDocument(
  result: DeepResearchResult,
  topic: string,
  language: ProjectLanguage
): DeepResearchDocument {
  return {
    topic,
    language,
    report: result.report,
    document: result.document,
    sections: result.sections,
    provider: result.provider ?? 'mock',
    mock: result.mock,
    createdAt: new Date().toISOString(),
    reason: result.reason,
  }
}

/**
 * Run faceless YouTube deep research (structured JSON report).
 * Provider order: Perplexity (when key set) → Gemini-first on free tier → OpenAI → Claude → Gemini → mock.
 */
export async function runDeepResearch(input: DeepResearchInput): Promise<DeepResearchResult> {
  const topic = input.topic.trim()
  const language = normalizeProjectLanguage(input.language)
  const userPrompt = buildDeepResearchSopPrompt(topic, language, input.directorMode)

  if (!topic) {
    const emptyReport = normalizeDeepResearchReport({}, '')
    return {
      topic,
      language,
      report: emptyReport,
      document: '',
      sections: null,
      mock: true,
      provider: 'mock',
      reason: 'empty_topic',
    }
  }

  const errors: string[] = []
  const perplexityPreferred = hasPerplexityKey()
  const geminiFirst = isFreeTierOnly() && !perplexityPreferred

  const accept = (report: DeepResearchReport | null, provider: DeepResearchProvider) => {
    if (!report) return null
    const normalized = normalizeDeepResearchReport(report, topic)
    if (!hasUsableDeepResearchReport(normalized)) return null
    return finalizeResearch(normalized, provider, topic, language)
  }

  const tryGemini = async (): Promise<DeepResearchResult | null> => {
    if (!hasDirectGeminiKey()) return null
    try {
      const report = await generateWithGemini(userPrompt)
      const result = accept(report, 'gemini')
      if (result) return result
      errors.push('gemini_empty')
    } catch (err) {
      logError('deep-research-engine.gemini', err)
      errors.push('gemini_failed')
    }
    return null
  }

  const tryPerplexity = async (): Promise<DeepResearchResult | null> => {
    if (!perplexityPreferred) return null
    try {
      const report = await generateWithPerplexity(userPrompt)
      const result = accept(report, 'perplexity')
      if (result) return result
      errors.push('perplexity_empty')
    } catch (err) {
      logError('deep-research-engine.perplexity', err)
      errors.push('perplexity_failed')
    }
    return null
  }

  const tryOpenAI = async (): Promise<DeepResearchResult | null> => {
    if (!allowOpenAIScript()) return null
    try {
      const report = await generateWithOpenAI(userPrompt)
      const result = accept(report, 'openai')
      if (result) return result
      errors.push('openai_empty')
    } catch (err) {
      logError('deep-research-engine.openai', err)
      errors.push('openai_failed')
    }
    return null
  }

  const tryAnthropic = async (): Promise<DeepResearchResult | null> => {
    if (!allowAnthropicScript()) return null
    try {
      const report = await generateWithAnthropic(userPrompt)
      const result = accept(report, 'anthropic')
      if (result) return result
      errors.push('anthropic_empty')
    } catch (err) {
      logError('deep-research-engine.anthropic', err)
      errors.push('anthropic_failed')
    }
    return null
  }

  const perplexity = await tryPerplexity()
  if (perplexity) return perplexity

  if (geminiFirst) {
    const gemini = await tryGemini()
    if (gemini) return gemini
  }

  const openai = await tryOpenAI()
  if (openai) return openai

  const anthropic = await tryAnthropic()
  if (anthropic) return anthropic

  if (!geminiFirst) {
    const gemini = await tryGemini()
    if (gemini) return gemini
  }

  const mock = buildMockDeepResearch(topic, language)
  if (errors.length > 0) mock.reason = errors.join(', ')
  return mock
}

/** @deprecated Alias — prefer {@link runDeepResearch}. */
export const runYoutubeDeepResearch = runDeepResearch
