export type {
  AIProvider,
  AITask,
  ProviderId,
  ProviderChain,
  HookInput,
  HookResult,
  ScriptInput,
  ScriptResult,
  ProviderContext,
  ProviderContextInput,
  ExecuteWithFallbackResult,
} from '@/lib/ai/providers/types'
export { AIProviderError } from '@/lib/ai/providers/types'

export { buildProviderContext, injectContext } from '@/lib/ai/providers/context-injection'
export {
  getAvailableProviders,
  getProviderChain,
  getProviderAttemptOrder,
  hasProviderKey,
  getTaskTimeoutMs,
} from '@/lib/ai/providers/task-routing'
export {
  getProviderHealthSnapshot,
  isProviderHealthy,
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/ai/providers/health'
export {
  executeWithFallback,
  getProviderForTask,
  getProviderInstance,
  getLastProviderForTask,
  getAllLastProviders,
  recordLastProvider,
} from '@/lib/ai/providers/router'

export { OpenAIProvider } from '@/lib/ai/providers/providers/openai-provider'
export { GeminiProvider } from '@/lib/ai/providers/providers/gemini-provider'
export { GroqProvider } from '@/lib/ai/providers/providers/groq-provider'
export { OpenRouterProvider } from '@/lib/ai/providers/providers/openrouter-provider'
export { DeepSeekProvider } from '@/lib/ai/providers/providers/deepseek-provider'
