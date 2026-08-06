import 'server-only'

import type { V7TextProviderId } from '@/lib/v7/providers/text-provider.types'
import { V7ProviderRequestError } from '@/lib/v7/providers/text-errors'

const DEBUG =
  process.env.V7_PROVIDER_DEBUG?.trim().toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'development'

export function logV7ProviderFailure(params: {
  agent: string
  providerId: V7TextProviderId
  displayName: string
  model?: string
  err: unknown
  nextProviderId?: V7TextProviderId
}): void {
  const { err } = params
  if (!(err instanceof V7ProviderRequestError)) {
    if (DEBUG) {
      console.warn(
        `[v7] ${params.agent}\nProvider: ${params.displayName}\nModel: ${params.model ?? 'n/a'}\nStatus: n/a\nCode: UNKNOWN\nMessage: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    return
  }

  const providerErr = err

  const lines = [
    `[v7] ${params.agent}`,
    `Provider: ${params.displayName}`,
    `Model: ${params.model ?? 'n/a'}`,
    `Status: ${providerErr.httpStatus ?? 'n/a'}`,
    `Code: ${providerErr.code}`,
    `Message: ${providerErr.message}`,
  ]

  if (params.nextProviderId) {
    lines.push('↓', params.nextProviderId)
  }

  console.warn(lines.join('\n'))
}

export function logV7ProviderHealthSkip(params: {
  agent: string
  providerId: V7TextProviderId
  message?: string
  nextProviderId?: V7TextProviderId
}): void {
  if (!DEBUG) return
  console.warn(
    `[v7] ${params.agent}\nProvider: ${params.providerId}\nHealth: skip\nMessage: ${params.message ?? 'unhealthy'}${params.nextProviderId ? `\n↓\n${params.nextProviderId}` : ''}`
  )
}
