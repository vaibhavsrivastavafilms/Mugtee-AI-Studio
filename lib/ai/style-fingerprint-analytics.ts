import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
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

function driftMetadata(payload: StyleFingerprintDriftPayload) {
  return {
    step: payload.step,
    provider: payload.provider,
    fingerprint_score: payload.fingerprint_score,
    retry_count: payload.retry_count,
    retry_reason: payload.retry_reason,
    projectId: payload.projectId ?? null,
    task: payload.task,
  }
}

/** Track cross-provider style drift and consistency retries (browser or server). */
export async function trackStyleFingerprintDrift(
  payload: StyleFingerprintDriftPayload
): Promise<void> {
  const metadata = driftMetadata(payload)

  if (typeof window !== 'undefined') {
    trackEvent(AnalyticsEvents.STYLE_FINGERPRINT_DRIFT, {
      projectId: payload.projectId,
      metadata,
    })
    return
  }

  try {
    const { trackServerEvent } = await import('@/lib/analytics/track-server-event')
    await trackServerEvent({
      event: AnalyticsEvents.STYLE_FINGERPRINT_DRIFT,
      metadata,
    })
  } catch {
    /* never block workflow */
  }
}
