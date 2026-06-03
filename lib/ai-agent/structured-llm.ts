const API_KEY = process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY
const API_BASE = process.env.EMERGENT_API_BASE || 'https://api.openai.com/v1'

export async function callStructuredJson<T>(opts: {
  system: string
  user: string
  schemaHint: string
  max_tokens?: number
}): Promise<T> {
  if (!API_KEY) {
    throw new Error('LLM API key not configured (EMERGENT_LLM_KEY or OPENAI_API_KEY)')
  }

  const userContent = `${opts.user}\n\nRespond with valid JSON only matching this schema:\n${opts.schemaHint}`

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: userContent },
      ],
      max_tokens: opts.max_tokens ?? 1200,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`LLM error: ${res.status} — ${(err as { error?: { message?: string } })?.error?.message || 'Unknown'}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const raw = data.choices[0]?.message?.content?.trim() || '{}'
  const parsed = JSON.parse(raw) as T
  return parsed
}
