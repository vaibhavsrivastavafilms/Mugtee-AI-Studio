import { getAnthropicClient, CLAUDE_SCRIPT_MODEL } from '@/lib/ai/anthropic-client'
import {
  allowAnthropicScript,
  allowOpenAIScript,
  FREE_GEMINI_TEXT_MODEL,
  FREE_OPENAI_CHAT_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  getGeminiApiKey,
  hasDirectGeminiKey,
} from '@/lib/ai/free-tier'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildDeepResearchPrompt,
  DEEP_RESEARCH_SECTION_HEADINGS,
} from '@/lib/ai/prompts/youtube/deep-research-prompt'
import {
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'
import { logError } from '@/lib/workspace/validation'

export type DeepResearchSections = {
  coreExplanation: string[]
  rareFacts: string[]
  viralHooks: string[]
  historicalContext: string[]
  comparisonsMetaphors: string[]
  controversies?: string[]
  futurePredictions?: string[]
}

export type DeepResearchResult = {
  document: string
  sections: DeepResearchSections | null
  mock: boolean
  provider?: 'openai' | 'anthropic' | 'gemini' | 'mock'
  reason?: string
}

export type DeepResearchInput = {
  topic: string
  language?: ProjectLanguage | string
}

const SYSTEM_PROMPT =
  'You are Mugtee Deep Research — a faceless YouTube research analyst. Output structured markdown with headings and bullet points only.'

function bulletsFromBlock(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

function sectionContent(document: string, heading: string): string[] {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    'i'
  )
  const match = document.match(re)
  if (!match?.[1]) return []
  return bulletsFromBlock(match[1])
}

/** Parse markdown research doc into structured sections (best-effort). */
export function parseDeepResearchSections(document: string): DeepResearchSections | null {
  const doc = document.trim()
  if (!doc) return null

  const sections: DeepResearchSections = {
    coreExplanation: sectionContent(doc, 'Core explanation'),
    rareFacts: sectionContent(doc, 'Rare facts'),
    viralHooks: sectionContent(doc, 'Extreme/viral hooks'),
    historicalContext: sectionContent(doc, 'Historical and cultural context'),
    comparisonsMetaphors: sectionContent(doc, 'Comparisons and metaphors'),
    controversies: sectionContent(doc, 'Controversies, myths, debates'),
    futurePredictions: sectionContent(doc, 'Future predictions'),
  }

  const hasContent = Object.values(sections).some(
    (v) => Array.isArray(v) && v.length > 0
  )
  return hasContent ? sections : null
}

function buildMockDeepResearch(topic: string, language: ProjectLanguage): DeepResearchResult {
  const label = languageLabel(language)
  const document = [
    '## Core explanation',
    `- ${topic} has a hidden narrative layer most faceless channels never surface`,
    `- The mainstream framing misses the tension that keeps viewers past the 30-second mark`,
    '',
    '## Rare facts',
    `- A specific detail about ${topic} that contradicts the popular mental model`,
    `- A counterintuitive statistic or timeline beat worth teasing early`,
    '',
    '## Extreme/viral hooks',
    `- "Everyone talks about ${topic} — but almost nobody mentions this part."`,
    `- Open loop: the moment the story pivots from familiar to unsettling`,
    `- Pattern interrupt: compare ${topic} to something the audience already fears or desires`,
    '',
    '## Historical and cultural context',
    `- When ${topic} entered public consciousness and why the timing mattered`,
    `- Cultural symbols or rituals tied to the topic that anchor documentary pacing`,
    '',
    '## Comparisons and metaphors',
    `- ${topic} is like a locked room — the audience thinks they know what's inside`,
    `- Bridge abstract stakes to everyday objects the viewer already understands`,
    '',
    '## Controversies, myths, debates',
    `- One myth to dismantle on-camera with receipts from established history`,
    '',
    '## Future predictions',
    `- Where ${topic} is heading in the next 3–5 years without sensationalism`,
    '',
    `_Mock research (${label}) — add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY for live output._`,
  ].join('\n')

  return {
    document,
    sections: parseDeepResearchSections(document),
    mock: true,
    provider: 'mock',
    reason: 'missing_api_key',
  }
}

async function generateWithOpenAI(userPrompt: string): Promise<string | null> {
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model: FREE_OPENAI_CHAT_MODEL,
    temperature: 0.85,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() || null
}

async function generateWithAnthropic(userPrompt: string): Promise<string | null> {
  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: CLAUDE_SCRIPT_MODEL,
    max_tokens: 4096,
    temperature: 0.85,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const textBlock = message.content.find((block) => block.type === 'text')
  return textBlock && textBlock.type === 'text' ? textBlock.text.trim() : null
}

async function generateWithGemini(userPrompt: string): Promise<string | null> {
  const key = getGeminiApiKey()
  if (!key || !hasDirectGeminiKey()) return null

  const model = FREE_GEMINI_TEXT_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.85 },
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
  return text.trim() || null
}

function finalizeResearch(document: string, provider: DeepResearchResult['provider']): DeepResearchResult {
  const trimmed = document.trim()
  return {
    document: trimmed,
    sections: parseDeepResearchSections(trimmed),
    mock: false,
    provider,
  }
}

function hasUsableResearch(document: string | null | undefined): document is string {
  if (!document?.trim()) return false
  if (document.trim().length < 120) return false
  const headingHits = DEEP_RESEARCH_SECTION_HEADINGS.filter((h) =>
    document.toLowerCase().includes(h.toLowerCase())
  ).length
  return headingHits >= 2
}

/**
 * Run faceless YouTube deep research (enhanced prompt — no live web search).
 * Provider order matches script generation: OpenAI → Claude → Gemini → mock.
 */
export async function runYoutubeDeepResearch(
  input: DeepResearchInput
): Promise<DeepResearchResult> {
  const topic = input.topic.trim()
  const language = normalizeProjectLanguage(input.language, topic)
  const userPrompt = buildDeepResearchPrompt(topic, language)

  if (!topic) {
    return {
      document: '',
      sections: null,
      mock: true,
      provider: 'mock',
      reason: 'empty_topic',
    }
  }

  const errors: string[] = []

  if (allowOpenAIScript()) {
    try {
      const doc = await generateWithOpenAI(userPrompt)
      if (hasUsableResearch(doc)) return finalizeResearch(doc, 'openai')
      errors.push('openai_empty')
    } catch (err) {
      logError('youtube-deep-research.openai', err)
      errors.push('openai_failed')
    }
  }

  if (allowAnthropicScript()) {
    try {
      const doc = await generateWithAnthropic(userPrompt)
      if (hasUsableResearch(doc)) return finalizeResearch(doc, 'anthropic')
      errors.push('anthropic_empty')
    } catch (err) {
      logError('youtube-deep-research.anthropic', err)
      errors.push('anthropic_failed')
    }
  }

  if (hasDirectGeminiKey()) {
    try {
      const doc = await generateWithGemini(userPrompt)
      if (hasUsableResearch(doc)) return finalizeResearch(doc, 'gemini')
      errors.push('gemini_empty')
    } catch (err) {
      logError('youtube-deep-research.gemini', err)
      errors.push('gemini_failed')
    }
  }

  const mock = buildMockDeepResearch(topic, language)
  if (errors.length > 0) mock.reason = errors.join(', ')
  return mock
}
