import type { TextLlmProviderId } from '@/agents/shared/provider-errors'

export type StructuredJsonRequest = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  timeoutMs?: number
  agent?: string
  projectId?: string
}

export interface TextLlmProvider {
  readonly id: TextLlmProviderId
  isConfigured(): boolean
  generateStructuredJson<T extends Record<string, unknown>>(
    params: StructuredJsonRequest
  ): Promise<T>
}
