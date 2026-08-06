import 'server-only'

import type { V3AspectRatio } from '@/types/v3/production'

export type V7VideoProviderId =
  | 'wan'
  | 'hunyuan'
  | 'cogvideox'
  | 'ltx'
  | 'mochi'
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

export interface V7VideoProvider {
  readonly id: V7VideoProviderId
  readonly displayName: string
  readonly modelId?: string

  supports(input: V7VideoGenerationInput): boolean
  validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string }
  health(): Promise<V7VideoProviderHealth>
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
