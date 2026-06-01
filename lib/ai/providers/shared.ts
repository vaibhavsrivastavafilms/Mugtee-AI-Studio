/** Shared helpers for JSON LLM responses across providers. */

export function parseLlmJsonText(raw: string): Record<string, unknown> {
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

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type OpenAICompatibleMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callOpenAICompatibleChat(params: {
  apiKey: string
  baseUrl: string
  model: string
  messages: OpenAICompatibleMessage[]
  temperature?: number
  jsonMode?: boolean
  timeoutMs: number
  extraHeaders?: Record<string, string>
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.85,
  }
  if (params.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetchWithTimeout(
    `${params.baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        ...params.extraHeaders,
      },
      body: JSON.stringify(body),
    },
    params.timeoutMs
  )

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}
