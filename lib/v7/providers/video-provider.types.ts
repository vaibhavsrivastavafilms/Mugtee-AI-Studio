import 'server-only'

import type { V3AspectRatio } from '@/types/v3/production'

export type V7VideoProviderId =
  | 'pollinations'
  | 'openart-mcp'
  | 'wan'
  | 'seedance'
  | 'runway'
  | 'cogvideox'
  | 'hunyuan'
  | 'mochi'
  | 'ltx'
  | 'animatediff'
  | 'image-animation'

export type V7VideoConsistencyMode = 'instantid' | 'ip-adapter' | 'pulid' | 'controlnet' | 'prompt'

export type V7VideoGenerationInput = {
  prompt: string
  negativePrompt: string
  imageUrl: string
  aspectRatio: V3AspectRatio
  width: number
  height: number
  durationSec: number
  seed: number
  sceneId: string
  sceneNumber: number
  productionId: string
  userId: string
  storagePath: string
  continuityId: string
  referenceImageUrls?: string[]
  consistencyModes?: V7VideoConsistencyMode[]
  promptArchive?: Record<string, unknown>
  cameraMovement?: string
  narration?: string
  dialogue?: string
  timeoutMs?: number
}

export type V7VideoGenerationResult = {
  success: boolean
  provider: V7VideoProviderId
  model: string
  videoUrl: string
  thumbnailUrl: string
  durationSec: number
  width: number
  height: number
  generationTimeMs: number
  retries: number
  storagePath: string
  metadata: Record<string, unknown>
  error?: string
}

export type V7VideoProviderHealth = {
  healthy: boolean
  latencyMs?: number
  message?: string
}

export type V7VideoProviderCapabilityReason =
  | 'NOT_CONFIGURED'
  | 'NOT_AUTHENTICATED'
  | 'MODEL_NOT_ENABLED'
  | 'MODEL_NOT_AVAILABLE'
  | 'NOT_ENTITLED'
  | 'UNHEALTHY'
  | 'INPUT_REJECTED'
  | 'NOT_SUPPORTED'

export type V7VideoProviderAccountCapabilities = {
  authenticated: boolean
  entitled: boolean
  reason?: V7VideoProviderCapabilityReason
  message?: string
  entitledModels?: string[]
}

export type V7VideoProviderAvailableModels = {
  models: string[]
  preferred?: string
}

export type V7DiscoveredVideoModel = {
  id: string
  available: boolean
  free: boolean
  priority: number
}

export type V7VideoProviderAvailableVideoModels = {
  models: V7DiscoveredVideoModel[]
  preferred?: V7DiscoveredVideoModel
}

export type V7VideoModelSelectionMetadata = {
  provider: string
  selectedModel: string
  fallbackFrom?: string
  reason: string
  discoveredModels?: string[]
  eligibleModels?: string[]
}

export type V7VideoProviderCapabilityReport = {
  provider: V7VideoProviderId
  available: boolean
  reason?: V7VideoProviderCapabilityReason
  message?: string
  models?: string[]
  entitledModels?: string[]
  latencyMs?: number
  priority: number
}

export type V7VideoProviderCapabilityContext = {
  userId?: string
}

export interface V7VideoProvider {
  readonly id: V7VideoProviderId
  readonly displayName: string
  readonly modelId?: string

  supports(input: V7VideoGenerationInput): boolean
  validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string }
  health(): Promise<V7VideoProviderHealth>
  availableModels(): Promise<V7VideoProviderAvailableModels>
  availableVideoModels(): Promise<V7VideoProviderAvailableVideoModels>
  accountCapabilities(
    context?: V7VideoProviderCapabilityContext
  ): Promise<V7VideoProviderAccountCapabilities>
  estimateCost(input: V7VideoGenerationInput): number
  estimateTime(input: V7VideoGenerationInput): number
  generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult>
  normalizeOutput(result: V7VideoGenerationResult): V7VideoGenerationResult
  retry(
    input: V7VideoGenerationInput,
    previous: V7VideoGenerationResult
  ): Promise<V7VideoGenerationResult>
  cancel(): void
  cleanup(): void
}
