import 'server-only'

/** V7 text provider slot identifiers — internal only, never shown in UI. */
export type V7TextProviderId =
  | 'openrouter-qwen'
  | 'openrouter-deepseek'
  | 'groq'
  | 'together'
  | 'ollama'

export type V7TextGenerationInput = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  projectId?: string
  agent?: string
  timeoutMs?: number
}

export type V7TextGenerationResult = {
  success: boolean
  provider: string
  model: string
  output: string
  tokens: number
  durationMs: number
  retries: number
  error?: string
}

export type V7TextProviderHealth = {
  healthy: boolean
  latencyMs?: number
  message?: string
}

export interface V7TextProvider {
  readonly id: V7TextProviderId
  readonly displayName: string
  /** Internal model slug — never shown in UI. */
  readonly modelId?: string

  supports(input: V7TextGenerationInput): boolean
  validateInput(input: V7TextGenerationInput): { ok: true } | { ok: false; reason: string }
  health(): Promise<V7TextProviderHealth>
  estimateCost(input: V7TextGenerationInput): number
  estimateTime(input: V7TextGenerationInput): number
  generate(input: V7TextGenerationInput): Promise<V7TextGenerationResult>
  normalizeOutput(raw: string): Record<string, unknown>
  retry(
    input: V7TextGenerationInput,
    previous: V7TextGenerationResult
  ): Promise<V7TextGenerationResult>
  cancel(): void
  cleanup(): void
}
