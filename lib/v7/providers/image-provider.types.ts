import 'server-only'

import type { V3AspectRatio } from '@/types/v3/production'

/** Internal image provider slot IDs — never shown in UI. */
export type V7ImageProviderId =
  | 'openart-mcp'
  | 'flux'
  | 'sdxl'
  | 'comfyui'
  | 'gpt-image'
  | 'pollinations'

export type V7ImageConsistencyMode = 'instantid' | 'ip-adapter' | 'pulid' | 'controlnet' | 'prompt'

export type V7ImageGenerationInput = {
  prompt: string
  negativePrompt: string
  aspectRatio: V3AspectRatio
  width: number
  height: number
  seed: number
  sceneId: string
  sceneNumber: number
  productionId: string
  userId: string
  storagePath: string
  referenceImageUrls?: string[]
  consistencyModes?: V7ImageConsistencyMode[]
  promptArchive?: Record<string, unknown>
  timeoutMs?: number
  /** Safe execution mode: single Pollinations attempt (no paid retries). */
  maxAttempts?: number
  /** Explicit Pollinations model id from live catalog estimate. */
  model?: string
}

export type V7ImageGenerationResult = {
  success: boolean
  provider: V7ImageProviderId
  model: string
  imageUrl: string
  thumbnailUrl: string
  seed: number
  width: number
  height: number
  generationTimeMs: number
  retries: number
  storagePath: string
  metadata: Record<string, unknown>
  error?: string
}

export type V7ImageProviderHealth = {
  healthy: boolean
  latencyMs?: number
  message?: string
}

export interface V7ImageProvider {
  readonly id: V7ImageProviderId
  readonly displayName: string
  readonly modelId?: string

  supports(input: V7ImageGenerationInput): boolean
  validateInput(input: V7ImageGenerationInput): { ok: true } | { ok: false; reason: string }
  health(): Promise<V7ImageProviderHealth>
  estimateCost(input: V7ImageGenerationInput): number
  estimateTime(input: V7ImageGenerationInput): number
  generate(input: V7ImageGenerationInput): Promise<V7ImageGenerationResult>
  normalizeOutput(result: V7ImageGenerationResult): V7ImageGenerationResult
  retry(
    input: V7ImageGenerationInput,
    previous: V7ImageGenerationResult
  ): Promise<V7ImageGenerationResult>
  cancel(): void
  cleanup(): void
}
