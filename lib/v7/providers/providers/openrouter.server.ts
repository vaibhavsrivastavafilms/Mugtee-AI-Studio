import 'server-only'

/**
 * V7 registry adapter — OpenRouter is the sole intelligence provider.
 * Implementation lives in lib/ai/providers/openrouter/.
 */
export { getOpenRouterTextProviderHealth as probeOpenRouterTextProviderHealth } from '@/lib/ai/providers/openrouter/health'
export {
  openRouterGenerateContent as generateOpenRouterContent,
  type OpenRouterGenerateInput,
  type OpenRouterGenerateResult,
} from '@/lib/ai/providers/openrouter/generate'
export {
  openRouterModelRouter,
  selectBestFreeOpenRouterModel,
} from '@/lib/ai/providers/openrouter/router'
