import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import type { ProviderId } from '@/lib/ai/providers/types'
import type { StyleConsistencyStep } from '@/lib/ai/style-fingerprint-validation'

export type StyleFingerprintDriftPayload = {
  step: StyleConsistencyStep
  provider: ProviderId | string
  fingerprint_score: number
  retry_count: number
  retry_reason?: string
  projectId?: string | null
  task?: string
}

/** Track cross-provider style drift and consistency retries (server-side). */
export async function trackStyleFingerprintDrift(
  payload: StyleFingerprintDriftPayload
): Promise<void> {
  await trackServerEvent({
    event: AnalyticsEvents.STYLE_FINGERPRINT_DRIFT,
    metadata: {
      step: payload.step,
      provider: payload.provider,
      fingerprint_score: payload.fingerprint_score,
      retry_count: payload.retry_count,
      retry_reason: payload.retry_reason,
      projectId: payload.projectId ?? null,
      task: payload.task,
    },
  })
}
