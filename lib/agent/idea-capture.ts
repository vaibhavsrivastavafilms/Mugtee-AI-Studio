import type { ParsedIdea } from '@/lib/agent/types'

const FORMAT_SIGNALS: Record<string, RegExp> = {
  reel: /\b(reel|short|60s|30s|vertical)\b/i,
  long_form: /\b(long|youtube|deep dive|essay|10 min)\b/i,
  experimental: /\b(experiment|try|test|new format)\b/i,
}

const EMOTION_SIGNALS: Record<string, RegExp> = {
  nostalgia: /\b(nostalg|memory|remember|childhood|used to)\b/i,
  tension: /\b(fear|anxiety|burnout|stress|overwhelm)\b/i,
  hope: /\b(hope|recover|transform|breakthrough|finally)\b/i,
  curiosity: /\b(why|how|secret|nobody|hidden|mistake)\b/i,
}

function extractTopic(raw: string): string | undefined {
  const cleaned = raw
    .replace(/^(i saw|i noticed|i found|something interesting|check out|wow)[:\s]*/i, '')
    .trim()
  const sentence = cleaned.split(/[.!?]/)[0]?.trim()
  if (!sentence || sentence.length < 8) return cleaned.slice(0, 120) || undefined
  return sentence.slice(0, 160)
}

function extractHook(raw: string, topic?: string): string | undefined {
  if (/\?/.test(raw)) {
    const q = raw.match(/[^.!?]*\?/)?.[0]?.trim()
    if (q && q.length >= 12) return q.slice(0, 180)
  }
  if (topic) return `What if ${topic.toLowerCase()}…`
  return undefined
}

export function parseIdeaCapture(rawText: string): ParsedIdea {
  const raw = rawText.trim()
  const topic = extractTopic(raw)
  const hook = extractHook(raw, topic)

  let format: string | undefined
  for (const [key, re] of Object.entries(FORMAT_SIGNALS)) {
    if (re.test(raw)) {
      format = key
      break
    }
  }

  let emotion: string | undefined
  for (const [key, re] of Object.entries(EMOTION_SIGNALS)) {
    if (re.test(raw)) {
      emotion = key
      break
    }
  }

  const tags = Object.entries(EMOTION_SIGNALS)
    .filter(([, re]) => re.test(raw))
    .map(([k]) => k)

  return { topic, hook, format, emotion, tags: tags.length ? tags : undefined }
}

export function ideaToProjectPrompt(parsed: ParsedIdea, rawText: string): string {
  const parts = [parsed.topic, parsed.hook, rawText.slice(0, 200)].filter(Boolean)
  return parts[0] ?? rawText.slice(0, 280)
}
