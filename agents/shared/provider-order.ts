import type { TextLlmProviderId } from '@/agents/shared/provider-errors'

export type ProviderMode = 'auto' | 'openai' | 'gemini'

export type ProviderLike = {
  readonly id: TextLlmProviderId
  isConfigured(): boolean
}

export function parseProviderMode(envVar: string): ProviderMode {
  const raw = process.env[envVar]?.trim().toLowerCase()
  if (raw === 'openai' || raw === 'gemini') return raw
  return 'auto'
}

/** auto: OpenAI first when configured, then Gemini. Explicit modes still allow fallback. */
export function resolveTextProviderOrder<P extends ProviderLike>(
  envVar: string,
  providers: P[]
): P[] {
  const mode = parseProviderMode(envVar)
  const byId = new Map(providers.map((p) => [p.id, p]))
  const openai = byId.get('openai')
  const gemini = byId.get('gemini')

  if (mode === 'openai') {
    const ordered: P[] = []
    if (openai?.isConfigured()) ordered.push(openai)
    if (gemini?.isConfigured() && gemini !== openai) ordered.push(gemini)
    return ordered
  }
  if (mode === 'gemini') {
    const ordered: P[] = []
    if (gemini?.isConfigured()) ordered.push(gemini)
    if (openai?.isConfigured() && openai !== gemini) ordered.push(openai)
    return ordered
  }

  const ordered: P[] = []
  if (openai?.isConfigured()) ordered.push(openai)
  if (gemini?.isConfigured() && gemini !== openai) ordered.push(gemini)
  if (ordered.length === 0 && gemini?.isConfigured()) ordered.push(gemini)
  return ordered
}

export function isPlannerDeterministicFallbackEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.PLANNER_DETERMINISTIC_FALLBACK?.trim().toLowerCase() === 'true'
}
