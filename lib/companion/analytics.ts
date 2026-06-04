import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'

const SESSION_KEY = 'mugtee:companion-workflow-session:v1'

export type CompanionAnalyticsSource =
  | 'live_home'
  | 'studio_footer'
  | 'sidekick'
  | 'realtime_api'

/** Mark that the creator engaged Live Companion before a studio workflow step. */
export function markCompanionWorkflowSession(source: CompanionAnalyticsSource): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ at: Date.now(), source })
    )
  } catch {
    /* quota */
  }
}

function readCompanionSession(): { at: number; source: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number; source?: string }
    if (!parsed?.at) return null
    return { at: parsed.at, source: String(parsed.source || 'unknown') }
  } catch {
    return null
  }
}

function clearCompanionSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function trackCompanionUsed(
  source: CompanionAnalyticsSource,
  metadata?: Record<string, unknown>
): void {
  markCompanionWorkflowSession(source)
  trackEvent(AnalyticsEvents.COMPANION_USED, {
    metadata: { source, ...metadata },
  })
}

/** After Quick Cut / generation completes — measures workflow lift, not chat volume. */
export function trackStoryGeneratedAfterCompanion(projectId?: string | null): void {
  const session = readCompanionSession()
  if (!session) return
  const withinWindow = Date.now() - session.at < 24 * 60 * 60 * 1000
  if (!withinWindow) {
    clearCompanionSession()
    return
  }
  trackEvent(AnalyticsEvents.STORY_GENERATED_AFTER_COMPANION, {
    projectId,
    metadata: {
      companion_source: session.source,
      lag_ms: Date.now() - session.at,
    },
  })
  clearCompanionSession()
}

/** After export completes — companion session must be active in the same browser session. */
export function trackExportCompletedAfterCompanion(projectId?: string | null): void {
  const session = readCompanionSession()
  if (!session) return
  trackEvent(AnalyticsEvents.EXPORT_COMPLETED_AFTER_COMPANION, {
    projectId,
    metadata: {
      companion_source: session.source,
      lag_ms: Date.now() - session.at,
    },
  })
}
