/**
 * Quick Cut free-tier policy: prefer Google Gemini (AI Studio), cheap OpenAI fallbacks, mocks.
 * Set FREE_TIER_ONLY=true to enforce; otherwise inferred when only free keys are present.
 */

export const FREE_GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-2.0-flash'

/** Direct Google API image model (AI Studio — Nano Banana / Flash Image). */
export const FREE_GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image'

/** Emergent gateway namespaced model (paid gateway — skipped when free-tier only). */
export const EMERGENT_GEMINI_IMAGE_MODEL =
  process.env.EMERGENT_GEMINI_IMAGE_MODEL?.trim() || 'gemini/gemini-2.5-flash-image'

/** OpenAI image model — gpt-image-1 replaces dall-e-3 on newer API keys. */
export const FREE_OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1'

export const FREE_OPENAI_CHAT_MODEL =
  process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

export const FREE_OPENAI_TTS_MODEL = 'tts-1'

export const GOOGLE_GENERATIVE_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta'

function envTruthy(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  )
}

export function hasDirectGeminiKey(): boolean {
  return Boolean(getGeminiApiKey())
}

/** Explicit free-only mode or inferred from env (Gemini only, no paid providers). */
export function isFreeTierOnly(): boolean {
  if (envTruthy('FREE_TIER_ONLY')) return true

  const hasGemini = hasDirectGeminiKey()
  const hasPaidScript =
    Boolean(process.env.ANTHROPIC_API_KEY?.trim()) ||
    Boolean(process.env.OPENAI_API_KEY?.trim())
  const hasEmergent = Boolean(process.env.EMERGENT_LLM_KEY?.trim())
  const hasEleven = Boolean(process.env.ELEVENLABS_API_KEY?.trim())
  const hasReplicate = Boolean(process.env.REPLICATE_API_TOKEN?.trim())

  if (hasGemini && !hasPaidScript && !hasEmergent && !hasEleven && !hasReplicate) {
    return true
  }
  return false
}

export function allowAnthropicScript(): boolean {
  return !isFreeTierOnly() && Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

export function allowOpenAIScript(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function allowEmergentGateway(): boolean {
  return !isFreeTierOnly() && Boolean(process.env.EMERGENT_LLM_KEY?.trim())
}

export function allowDalleImages(): boolean {
  if (isFreeTierOnly()) return false
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function allowReplicateImages(): boolean {
  if (isFreeTierOnly()) return false
  return Boolean(process.env.REPLICATE_API_TOKEN?.trim())
}

export function allowElevenLabsVoice(): boolean {
  if (isFreeTierOnly()) return false
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim())
}

export function allowEmergentTts(): boolean {
  if (isFreeTierOnly()) return false
  return Boolean(process.env.EMERGENT_LLM_KEY?.trim())
}

export function allowOpenAITts(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export type QuickCutProviderConfig = {
  freeTierOnly: boolean
  gemini: boolean
  geminiDirect: boolean
  emergent: boolean
  anthropic: boolean
  openai: boolean
  elevenlabs: boolean
  replicate: boolean
  models: {
    geminiText: string
    geminiImage: string
    openaiChat: string
    openaiTts: string
    anthropicScript: string | null
  }
}

export function buildQuickCutProviderConfig(): QuickCutProviderConfig {
  const freeTierOnly = isFreeTierOnly()
  const geminiDirect = hasDirectGeminiKey()
  const emergent = allowEmergentGateway()
  return {
    freeTierOnly,
    gemini: geminiDirect || emergent,
    geminiDirect,
    emergent,
    anthropic: allowAnthropicScript(),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    elevenlabs: allowElevenLabsVoice(),
    replicate: allowReplicateImages(),
    models: {
      geminiText: FREE_GEMINI_TEXT_MODEL,
      geminiImage: geminiDirect ? FREE_GEMINI_IMAGE_MODEL : EMERGENT_GEMINI_IMAGE_MODEL,
      openaiChat: FREE_OPENAI_CHAT_MODEL,
      openaiTts: FREE_OPENAI_TTS_MODEL,
      anthropicScript: allowAnthropicScript()
        ? process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'
        : null,
    },
  }
}
