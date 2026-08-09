import 'server-only'

export {
  initializeOpenRouter,
  isOpenRouterModelFailoverError,
  isOpenRouterModelFree,
  isOpenRouterTextChatModel,
  openRouterModelRouter,
  OpenRouterModelRouter,
  rankFreeModels,
  type OpenRouterFreeModel,
} from '@/lib/ai/providers/openrouter/router'
