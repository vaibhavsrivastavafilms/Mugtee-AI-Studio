import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { ContentBrief } from '@/lib/content-director/content-brief'
import type { ParsedCreatorIntent } from '@/lib/input-understanding'
import type { MemoryProfile } from '@/lib/memory/types'
import type { CreatorMemory } from '@/lib/companion/types'
import type { CreatorStyleFingerprint } from '@/lib/ai/style-fingerprint'
import type { DirectorStudioContext } from '@/lib/director/types'

/** Supported text-generation providers for Phase 1 routing. */
export type ProviderId = 'openai' | 'gemini' | 'groq' | 'openrouter' | 'deepseek'

export type AITask =
  | 'hook'
  | 'script'
  | 'title'
  | 'caption'
  | 'visual'
  | 'storyboard'
  | 'voice'
  | 'research'

export type ProviderChain = {
  primary: ProviderId
  fallback: ProviderId
  emergency: ProviderId
}

export type ProviderContextInput = {
  topic: string
  niche?: CinematicNiche | string
  tone?: string
  platform?: string
  duration?: number
  visualStyle?: Partial<VisualStyle> | VisualStyle | null
  emotionalGoal?: string
  parsedIntent?: ParsedCreatorIntent | null
  memoryProfile?: MemoryProfile | null
  companionMemory?: CreatorMemory | null
  contentBrief?: ContentBrief | null
  directorStudioContext?: DirectorStudioContext | null
}

export type ProviderContext = {
  /** Merged prompt prefix injected before each provider call */
  injectionBlock: string
  nicheLock: string
  styleFingerprint: CreatorStyleFingerprint
}

export type HookInput = {
  topic: string
  niche: CinematicNiche | string
  tone?: string
  platform?: string
  emotionalGoal?: string
  previousHooks?: string[]
  contentAngleLabel?: string
  hookFrameworkLabel?: string
  context?: ProviderContext
}

export type HookResult = {
  hook: string
  title?: string
  hookFramework?: string
  provider: ProviderId
}

export type ScriptInput = {
  systemPrompt: string
  userPrompt: string
  topic: string
  temperature?: number
  context?: ProviderContext
}

export type ScriptResult = {
  parsed: Record<string, unknown>
  provider: ProviderId
}

export type TitleResult = {
  title: string
  provider: ProviderId
}

export type CaptionResult = {
  captions: Record<string, unknown>
  provider: ProviderId
}

/** Unified provider interface — Phase 1 implements hook + script; others stub to OpenAI. */
export interface AIProvider {
  readonly id: ProviderId
  isAvailable(): boolean
  generateHook(input: HookInput): Promise<HookResult>
  generateScript(input: ScriptInput): Promise<ScriptResult>
  generateTitle(input: HookInput): Promise<TitleResult>
  generateCaption(input: HookInput & { script?: string }): Promise<CaptionResult>
}

export type ExecuteWithFallbackResult<T> = T & { provider: ProviderId; attemptedProviders: ProviderId[] }

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly friendlyMessage: string,
    readonly provider?: ProviderId,
    readonly task?: AITask
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
