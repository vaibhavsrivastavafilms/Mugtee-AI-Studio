import 'server-only'

/**
 * Script agent uses shared structured LLM fallback via `agents/shared/llm-json.server.ts`.
 * Configure priority with SCRIPT_PROVIDER=auto|openai|gemini.
 */
export const SCRIPT_PROVIDER_ENV = 'SCRIPT_PROVIDER'
