/** Perplexity Sonar — deep research (web-augmented). OpenAI-compatible chat API. */

export const PERPLEXITY_API_BASE = 'https://api.perplexity.ai'

export const DEFAULT_PERPLEXITY_RESEARCH_MODEL =
  process.env.PERPLEXITY_MODEL?.trim() || 'sonar-pro'

export function getPerplexityApiKey(): string | undefined {
  return process.env.PERPLEXITY_API_KEY?.trim() || undefined
}

export function hasPerplexityKey(): boolean {
  return Boolean(getPerplexityApiKey())
}

export type PerplexityChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type PerplexityChatOptions = {
  model?: string
  temperature?: number
  jsonObject?: boolean
  messages: PerplexityChatMessage[]
}

/** POST /chat/completions — returns assistant text or null on HTTP/parse failure. */
export async function perplexityChatCompletion(
  options: PerplexityChatOptions
): Promise<string | null> {
  const apiKey = getPerplexityApiKey()
  if (!apiKey) return null

  const model = options.model?.trim() || DEFAULT_PERPLEXITY_RESEARCH_MODEL
  const body: Record<string, unknown> = {
    model,
    temperature: options.temperature ?? 0.85,
    messages: options.messages,
  }
  if (options.jsonObject) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${PERPLEXITY_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) return null

  const data = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>
  } | null
  const content = data?.choices?.[0]?.message?.content?.trim()
  return content || null
}
