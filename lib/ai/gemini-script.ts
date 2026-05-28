import {
  FREE_GEMINI_TEXT_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  getGeminiApiKey,
  hasDirectGeminiKey,
} from '@/lib/ai/free-tier'
import { logError } from '@/lib/workspace/validation'

function parseGeminiJsonText(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
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

/** Generate cinematic script JSON via Google AI Studio (free-tier friendly). */
export async function generateScriptWithGemini(params: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
}): Promise<Record<string, unknown> | null> {
  const key = getGeminiApiKey()
  if (!key || !hasDirectGeminiKey()) return null

  const model = FREE_GEMINI_TEXT_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          temperature: params.temperature ?? 0.85,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      logError('gemini-script.provider', new Error(`HTTP ${res.status}`))
      return null
    }

    const json = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('') ?? ''
    if (!text.trim()) return null
    return parseGeminiJsonText(text)
  } catch (err) {
    logError('gemini-script', err)
    return null
  }
}
