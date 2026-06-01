import { createCachedOpenAIChatCompletion } from '@/lib/ai/cached-openai-chat.server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import type { ParsedCreatorIntent } from '@/lib/input-understanding/types'

/** Instruction/meta phrases stripped before generation (longest first). */
export const INSTRUCTION_PREFIXES: readonly string[] = [
  'help me create a',
  'help me create',
  'help me make a',
  'help me make',
  'help me write a',
  'help me write',
  'help me generate a',
  'help me generate',
  'can you create a',
  'can you create',
  'can you make a',
  'can you make',
  'can you write a',
  'can you write',
  'can you generate a',
  'can you generate',
  'i want to create a',
  'i want to create',
  'i want to make a',
  'i want to make',
  'i want a',
  'i want',
  'i need to create a',
  'i need to create',
  'i need a',
  'i need',
  'write me a',
  'write me',
  'generate me a',
  'generate me',
  'generate a',
  'generate',
  'make me a',
  'make me',
  'make a',
  'create a',
  'create',
]

export const NICHE_KEYWORDS: readonly { pattern: RegExp; niche: string }[] = [
  { pattern: /\bpsychology\b/i, niche: 'psychology' },
  { pattern: /\bdocumentary\b/i, niche: 'documentary' },
  { pattern: /\bbusiness\b/i, niche: 'finance' },
  { pattern: /\bfinance\b/i, niche: 'finance' },
  { pattern: /\b(?:\bai\b|artificial intelligence)\b/i, niche: 'tech' },
  { pattern: /\bmotivation(?:al)?\b/i, niche: 'motivation' },
  { pattern: /\bhistory\b/i, niche: 'history' },
  { pattern: /\bmystery\b/i, niche: 'mystery' },
  { pattern: /\btech(?:nology)?\b/i, niche: 'tech' },
  { pattern: /\bhealth\b|\bwellness\b/i, niche: 'health' },
  { pattern: /\bspiritual(?:ity)?\b/i, niche: 'spirituality' },
  { pattern: /\bstorytelling\b|\bstory\b/i, niche: 'storytelling' },
  { pattern: /\bfitness\b/i, niche: 'fitness' },
  { pattern: /\bluxury\b/i, niche: 'luxury' },
  { pattern: /\bfaceless\b/i, niche: 'faceless reels' },
]

export const GOAL_KEYWORDS: readonly { pattern: RegExp; goal: string }[] = [
  { pattern: /\bviral\b/i, goal: 'viral' },
  { pattern: /\beducational\b|\beducate\b/i, goal: 'educational' },
  { pattern: /\bstorytelling\b/i, goal: 'storytelling' },
  { pattern: /\binspirational\b|\binspire\b/i, goal: 'inspirational' },
  { pattern: /\binvestigative\b|\binvestigation\b/i, goal: 'investigative' },
  { pattern: /\bcinematic\b/i, goal: 'cinematic' },
]

export const PLATFORM_KEYWORDS: readonly { pattern: RegExp; platform: string }[] = [
  { pattern: /\b(?:youtube|yt)\b/i, platform: 'youtube' },
  { pattern: /\b(?:tiktok|tt)\b/i, platform: 'tiktok' },
  { pattern: /\b(?:instagram|ig)\b|\breels?\b/i, platform: 'instagram_reel' },
  { pattern: /\bshorts?\b|\bshort[- ]form\b/i, platform: 'shorts' },
]

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function stripLeadingArticles(text: string): string {
  return text.replace(/^(?:a|an|the)\s+/i, '').trim()
}

function capitalizeSubject(text: string): string {
  const t = text.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function extractFirstMatch<T extends { pattern: RegExp }>(
  text: string,
  entries: readonly T[],
  pick: (entry: T) => string
): string | undefined {
  for (const entry of entries) {
    if (entry.pattern.test(text)) return pick(entry)
  }
  return undefined
}

function removeMatchedKeywords(text: string, patterns: RegExp[]): string {
  let out = text
  for (const pattern of patterns) {
    out = out.replace(pattern, ' ')
  }
  return normalizeWhitespace(out)
}

/** Rules-only intent parse — safe on client and server without API keys. */
export function parseCreatorIntentSync(rawInput: string): ParsedCreatorIntent {
  const raw = rawInput.trim()
  let working = raw.toLowerCase()

  for (const prefix of INSTRUCTION_PREFIXES) {
    if (working.startsWith(prefix)) {
      working = working.slice(prefix.length).trim()
      break
    }
  }

  working = stripLeadingArticles(working)

  const niche =
    extractFirstMatch(raw, NICHE_KEYWORDS, (e) => e.niche) ??
    extractFirstMatch(working, NICHE_KEYWORDS, (e) => e.niche)
  const goal =
    extractFirstMatch(raw, GOAL_KEYWORDS, (e) => e.goal) ??
    extractFirstMatch(working, GOAL_KEYWORDS, (e) => e.goal)
  const platform =
    extractFirstMatch(raw, PLATFORM_KEYWORDS, (e) => e.platform) ??
    extractFirstMatch(working, PLATFORM_KEYWORDS, (e) => e.platform)

  let cleanTopic = working
  cleanTopic = removeMatchedKeywords(cleanTopic, GOAL_KEYWORDS.map((g) => g.pattern))
  cleanTopic = removeMatchedKeywords(cleanTopic, PLATFORM_KEYWORDS.map((p) => p.pattern))
  cleanTopic = stripLeadingArticles(normalizeWhitespace(cleanTopic))

  if (!cleanTopic && niche) {
    cleanTopic = platform ? `${niche} ${platform === 'shorts' ? 'short' : platform}` : niche
  }

  if (!cleanTopic) {
    cleanTopic = normalizeWhitespace(
      raw.replace(new RegExp(INSTRUCTION_PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i'), '')
    )
    cleanTopic = stripLeadingArticles(cleanTopic) || raw
  }

  const topic =
    niche && cleanTopic.toLowerCase().includes(niche)
      ? capitalizeSubject(niche)
      : capitalizeSubject(cleanTopic.split(/\s+/).slice(0, 4).join(' '))

  return {
    topic,
    niche,
    goal,
    platform,
    cleanTopic: capitalizeSubject(cleanTopic),
    rawInput: raw,
  }
}

async function parseCreatorIntentWithLlm(rawInput: string): Promise<Partial<ParsedCreatorIntent> | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null

  try {
    const openai = getOpenAIClient()
    const completion = await createCachedOpenAIChatCompletion(openai, {
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extract creator intent from user input. Return JSON: topic, niche, goal, platform, tone, cleanTopic. cleanTopic must be the subject only — no verbs like help/create/generate/write. Never echo instruction phrases.',
        },
        { role: 'user', content: rawInput.slice(0, 500) },
      ],
    })
    const text = completion.choices[0]?.message?.content
    if (!text) return null
    const parsed = JSON.parse(text) as Record<string, unknown>
    const cleanTopic =
      typeof parsed.cleanTopic === 'string' && parsed.cleanTopic.trim()
        ? parsed.cleanTopic.trim()
        : typeof parsed.topic === 'string'
          ? parsed.topic.trim()
          : ''
    if (!cleanTopic) return null
    return {
      topic: typeof parsed.topic === 'string' ? parsed.topic.trim() : cleanTopic,
      niche: typeof parsed.niche === 'string' ? parsed.niche.trim() : undefined,
      goal: typeof parsed.goal === 'string' ? parsed.goal.trim() : undefined,
      platform: typeof parsed.platform === 'string' ? parsed.platform.trim() : undefined,
      tone: typeof parsed.tone === 'string' ? parsed.tone.trim() : undefined,
      cleanTopic,
      rawInput: rawInput.trim(),
    }
  } catch {
    return null
  }
}

/** Async parse — LLM refinement when OpenAI key present, rules fallback always available. */
export async function parseCreatorIntent(rawInput: string): Promise<ParsedCreatorIntent> {
  const rules = parseCreatorIntentSync(rawInput)
  const llm = await parseCreatorIntentWithLlm(rawInput)
  if (!llm?.cleanTopic) return rules

  return {
    topic: llm.topic || rules.topic,
    niche: llm.niche || rules.niche,
    goal: llm.goal || rules.goal,
    platform: llm.platform || rules.platform,
    tone: llm.tone || rules.tone,
    cleanTopic: llm.cleanTopic || rules.cleanTopic,
    rawInput: rules.rawInput,
  }
}

export function logParsedIntent(intent: ParsedCreatorIntent): void {
  if (process.env.NODE_ENV !== 'development') return
  const parts = [`topic=${intent.topic}`]
  if (intent.goal) parts.push(`goal=${intent.goal}`)
  if (intent.niche) parts.push(`niche=${intent.niche}`)
  if (intent.platform) parts.push(`platform=${intent.platform}`)
  console.log(`[intent] ${parts.join(' ')}`)
}
