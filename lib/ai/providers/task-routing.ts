import type { AITask, ProviderChain, ProviderId } from '@/lib/ai/providers/types'

const ALL_PROVIDERS: ProviderId[] = ['openai', 'gemini', 'groq', 'openrouter', 'deepseek']

const TASK_ENV_PREFIX: Record<AITask, string> = {
  hook: 'HOOK',
  script: 'SCRIPT',
  title: 'TITLE',
  caption: 'CAPTION',
  visual: 'VISUAL',
  storyboard: 'STORYBOARD',
  voice: 'VOICE',
  research: 'RESEARCH',
}

/** Task-specific default priority when env vars are unset. */
const TASK_DEFAULT_ORDER: Record<AITask, ProviderId[]> = {
  hook: ['gemini', 'groq', 'openai', 'openrouter', 'deepseek'],
  script: ['openai', 'gemini', 'groq', 'openrouter', 'deepseek'],
  title: ['gemini', 'openai', 'groq', 'openrouter', 'deepseek'],
  caption: ['groq', 'gemini', 'openai', 'openrouter', 'deepseek'],
  visual: ['openai', 'gemini', 'openrouter', 'deepseek', 'groq'],
  storyboard: ['openai', 'gemini', 'groq', 'openrouter', 'deepseek'],
  voice: ['openai', 'gemini', 'groq', 'openrouter', 'deepseek'],
  research: ['openai', 'gemini', 'openrouter', 'deepseek', 'groq'],
}

function parseProviderId(raw: string | undefined): ProviderId | null {
  const v = raw?.trim().toLowerCase()
  if (!v) return null
  return ALL_PROVIDERS.includes(v as ProviderId) ? (v as ProviderId) : null
}

function envProvider(task: AITask, slot: 'PRIMARY' | 'FALLBACK' | 'EMERGENCY'): ProviderId | null {
  const prefix = TASK_ENV_PREFIX[task]
  return parseProviderId(process.env[`AI_PROVIDER_${prefix}_${slot}`])
}

export function hasProviderKey(id: ProviderId): boolean {
  switch (id) {
    case 'openai':
      return Boolean(process.env.OPENAI_API_KEY?.trim())
    case 'gemini':
      return Boolean(
        process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
      )
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY?.trim())
    case 'openrouter':
      return Boolean(process.env.OPENROUTER_API_KEY?.trim())
    case 'deepseek':
      return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
    default:
      return false
  }
}

export function getAvailableProviders(): ProviderId[] {
  return ALL_PROVIDERS.filter(hasProviderKey)
}

function pickFromOrder(order: ProviderId[], available: Set<ProviderId>): ProviderId | null {
  for (const id of order) {
    if (available.has(id)) return id
  }
  return null
}

function buildDefaultChain(task: AITask, available: ProviderId[]): ProviderChain {
  const set = new Set(available)
  const order = TASK_DEFAULT_ORDER[task]
  const primary = pickFromOrder(order, set) ?? available[0] ?? 'openai'
  const rest = order.filter((id) => id !== primary && set.has(id))
  const fallback = rest[0] ?? primary
  const emergency = rest[1] ?? fallback
  return { primary, fallback, emergency }
}

/** Resolve primary → fallback → emergency chain for a task from env or sensible defaults. */
export function getProviderChain(task: AITask): ProviderChain {
  const available = getAvailableProviders()
  if (available.length === 0) {
    return { primary: 'openai', fallback: 'openai', emergency: 'openai' }
  }

  const defaults = buildDefaultChain(task, available)
  const primary = envProvider(task, 'PRIMARY') ?? defaults.primary
  const fallback = envProvider(task, 'FALLBACK') ?? defaults.fallback
  const emergency = envProvider(task, 'EMERGENCY') ?? defaults.emergency

  return { primary, fallback, emergency }
}

/** Ordered unique provider list for fallback execution. Skips unavailable keys. */
export function getProviderAttemptOrder(task: AITask): ProviderId[] {
  const chain = getProviderChain(task)
  const seen = new Set<ProviderId>()
  const order: ProviderId[] = []

  for (const id of [chain.primary, chain.fallback, chain.emergency]) {
    if (seen.has(id)) continue
    seen.add(id)
    if (hasProviderKey(id)) order.push(id)
  }

  // Append any remaining available providers as last-resort
  for (const id of TASK_DEFAULT_ORDER[task]) {
    if (!seen.has(id) && hasProviderKey(id)) {
      seen.add(id)
      order.push(id)
    }
  }

  return order
}

export function getTaskTimeoutMs(task: AITask): number {
  if (task === 'script' || task === 'storyboard' || task === 'research') return 60_000
  if (task === 'hook' || task === 'title' || task === 'caption') return 15_000
  return 30_000
}
