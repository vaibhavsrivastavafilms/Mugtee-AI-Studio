/** Client-safe provider diagnostics types (no server secrets). */

export type ProviderFailureSummary = {
  provider: string
  status: number | null
  reason: string
  errorCode?: string
  retryable?: boolean
  cooldownRemaining?: number
  skipped?: boolean
}

export class ProviderFailureError extends Error {
  readonly name = 'ProviderFailureError'

  constructor(
    message: string,
    readonly providers: ProviderFailureSummary[],
    readonly retryAfterSeconds?: number
  ) {
    super(message)
  }
}

export function parseProviderFailures(value: unknown): ProviderFailureSummary[] | null {
  if (!Array.isArray(value)) return null
  const out: ProviderFailureSummary[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.provider !== 'string') continue
    out.push({
      provider: row.provider,
      status: typeof row.status === 'number' ? row.status : null,
      reason: typeof row.reason === 'string' ? row.reason : 'Provider error',
      errorCode: typeof row.errorCode === 'string' ? row.errorCode : undefined,
      retryable: typeof row.retryable === 'boolean' ? row.retryable : undefined,
      cooldownRemaining:
        typeof row.cooldownRemaining === 'number' ? row.cooldownRemaining : undefined,
      skipped: typeof row.skipped === 'boolean' ? row.skipped : undefined,
    })
  }
  return out.length > 0 ? out : null
}

export const PROVIDER_UNAVAILABLE_HEADLINE = 'AI providers temporarily unavailable.'

export function formatProviderLabel(id: string): string {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    gemini: 'Gemini',
    groq: 'Groq',
    openrouter: 'OpenRouter',
    deepseek: 'DeepSeek',
  }
  return labels[id] ?? id.charAt(0).toUpperCase() + id.slice(1)
}
