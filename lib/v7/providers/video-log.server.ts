import 'server-only'

import type { V7VideoProviderErrorCode } from '@/lib/v7/providers/video-errors'
import type { V7VideoProviderId } from '@/lib/v7/providers/video-provider.types'

export function logV7VideoProviderSuccess(params: {
  sceneNumber: number
  productionId: string
  providerId: V7VideoProviderId
  model: string
  durationMs: number
  retries: number
  durationSec: number
  storagePath: string
}): void {
  console.info('[v7-video] scene complete', params)
}

export function logV7VideoProviderFailure(params: {
  sceneNumber: number
  productionId: string
  providerId: V7VideoProviderId
  displayName: string
  model?: string
  err: unknown
  nextProviderId?: V7VideoProviderId
}): void {
  console.warn('[v7-video] provider failed', {
    sceneNumber: params.sceneNumber,
    productionId: params.productionId,
    provider: params.providerId,
    model: params.model,
    next: params.nextProviderId,
    message: params.err instanceof Error ? params.err.message : String(params.err),
  })
}

export function logV7VideoProviderHealthSkip(params: {
  sceneNumber: number
  providerId: V7VideoProviderId
  message?: string
  nextProviderId?: V7VideoProviderId
}): void {
  console.info('[v7-video] provider skipped (unhealthy)', params)
}

export function logV7VideoAllFailed(params: {
  sceneNumber: number
  productionId: string
  failures: Array<{ provider: V7VideoProviderId; code: V7VideoProviderErrorCode; message?: string }>
}): void {
  console.error('[v7-video] all providers failed', params)
}
