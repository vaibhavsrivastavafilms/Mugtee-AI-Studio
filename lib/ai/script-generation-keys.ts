import { getAvailableProviders, hasProviderKey } from '@/lib/ai/providers/task-routing'
import { allowAnthropicScript, allowOpenAIScript, hasDirectGeminiKey } from '@/lib/ai/free-tier'

/** True when any provider can run Quick Cut script generation. */
export function hasScriptGenerationKey(): boolean {
  return Boolean(
    getAvailableProviders().length > 0 ||
      hasDirectGeminiKey() ||
      allowAnthropicScript() ||
      allowOpenAIScript()
  )
}

/** All configured text provider keys (for pipeline status). */
export function listConfiguredTextProviders(): string[] {
  const ids = ['openai', 'gemini', 'groq', 'openrouter', 'deepseek'] as const
  return ids.filter(hasProviderKey)
}
