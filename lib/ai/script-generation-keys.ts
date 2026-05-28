import { allowAnthropicScript, allowOpenAIScript, hasDirectGeminiKey } from '@/lib/ai/free-tier'

/** True when any provider can run Quick Cut script generation. */
export function hasScriptGenerationKey(): boolean {
  return Boolean(
    hasDirectGeminiKey() ||
      allowAnthropicScript() ||
      allowOpenAIScript()
  )
}
