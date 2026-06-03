import type { AITask, ProviderId } from '@/lib/ai/providers/types'
import { getProviderAttemptOrder, hasProviderKey } from '@/lib/ai/providers/task-routing'
import { getProviderForTask } from '@/lib/ai/providers/router'

export type AgentModelTask = 'creative' | 'reasoning' | 'vision' | AITask

export type ModelRouteHint = {
  task: AgentModelTask
  providerId: ProviderId | null
  quality: 'high' | 'balanced' | 'fast'
  costHint: 'low' | 'medium' | 'high'
  fallbackOrder: ProviderId[]
}

const TASK_MAP: Record<AgentModelTask, AITask> = {
  creative: 'script',
  reasoning: 'research',
  vision: 'visual',
  hook: 'hook',
  script: 'script',
  title: 'title',
  caption: 'caption',
  visual: 'visual',
  storyboard: 'storyboard',
  voice: 'voice',
  research: 'research',
}

const COST_BY_PROVIDER: Record<ProviderId, 'low' | 'medium' | 'high'> = {
  groq: 'low',
  deepseek: 'low',
  gemini: 'medium',
  openrouter: 'medium',
  openai: 'high',
}

export function routeModelForAgentTask(task: AgentModelTask): ModelRouteHint {
  const aiTask = TASK_MAP[task] ?? 'script'
  const fallbackOrder = getProviderAttemptOrder(aiTask).filter(hasProviderKey)
  const primary = getProviderForTask(aiTask)
  const providerId = primary?.id ?? fallbackOrder[0] ?? null

  const quality =
    task === 'reasoning' || task === 'research' ? 'high' : task === 'creative' ? 'balanced' : 'fast'

  return {
    task,
    providerId,
    quality,
    costHint: providerId ? COST_BY_PROVIDER[providerId] : 'medium',
    fallbackOrder,
  }
}

export function modelIdForStructuredLlm(hint: ModelRouteHint): string {
  if (hint.providerId === 'gemini') return 'gemini-2.0-flash'
  if (hint.providerId === 'groq') return 'llama-3.3-70b-versatile'
  return 'gpt-4o-mini'
}
