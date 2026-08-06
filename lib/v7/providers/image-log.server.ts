import 'server-only'

import type { V7ImageProviderId } from '@/lib/v7/providers/image-provider.types'
import { V7ImageProviderRequestError } from '@/lib/v7/providers/image-errors'

const DEBUG =
  process.env.V7_IMAGE_PROVIDER_DEBUG?.trim().toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'development'

export function logV7ImageProviderSuccess(params: {
  sceneNumber: number
  productionId: string
  providerId: V7ImageProviderId
  model: string
  durationMs: number
  retries: number
  resolution: string
  seed: number
  storagePath: string
}): void {
  if (!DEBUG) return
  console.info(
    `[v7-image] scene ${params.sceneNumber}\nProduction: ${params.productionId}\nProvider: ${params.providerId}\nModel: ${params.model}\nDuration: ${params.durationMs} ms\nRetries: ${params.retries}\nResolution: ${params.resolution}\nSeed: ${params.seed}\nStorage: ${params.storagePath}\nStatus: Success`
  )
}

export function logV7ImageProviderFailure(params: {
  sceneNumber: number
  productionId: string
  providerId: V7ImageProviderId
  displayName: string
  model?: string
  err: unknown
  nextProviderId?: V7ImageProviderId
}): void {
  const { err } = params
  if (!(err instanceof V7ImageProviderRequestError)) {
    if (DEBUG) {
      console.warn(
        `[v7-image] scene ${params.sceneNumber}\nProvider: ${params.displayName}\nModel: ${params.model ?? 'n/a'}\nCode: UNKNOWN\nMessage: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    return
  }

  const lines = [
    `[v7-image] scene ${params.sceneNumber}`,
    `Provider: ${params.displayName}`,
    `Model: ${params.model ?? 'n/a'}`,
    `Code: ${err.code}`,
    `Message: ${err.message}`,
  ]

  if (params.nextProviderId) {
    lines.push('↓', params.nextProviderId)
  }

  console.warn(lines.join('\n'))
}

export function logV7ImageProviderHealthSkip(params: {
  sceneNumber: number
  providerId: V7ImageProviderId
  message?: string
  nextProviderId?: V7ImageProviderId
}): void {
  if (!DEBUG) return
  console.warn(
    `[v7-image] scene ${params.sceneNumber}\nProvider: ${params.providerId}\nHealth: skip\nMessage: ${params.message ?? 'unhealthy'}${params.nextProviderId ? `\n↓\n${params.nextProviderId}` : ''}`
  )
}

export function logV7ImageAllFailed(params: {
  sceneNumber: number
  productionId: string
  failures: Array<{ provider: V7ImageProviderId; code: string; message?: string }>
}): void {
  console.error(
    `[v7-image] scene ${params.sceneNumber}: all providers failed ${JSON.stringify({
      productionId: params.productionId,
      failures: params.failures,
    })}`
  )
}
