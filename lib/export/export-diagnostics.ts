import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackError, trackEvent } from '@/lib/analytics/track-event'

type ExportTiming = {
  startedAt: number
  projectId?: string | null
}

const timings = new Map<string, ExportTiming>()

function sessionKey(projectId?: string | null): string {
  return projectId?.trim() || 'anonymous'
}

/** Mark export job start for duration metrics. */
export function recordExportStarted(projectId?: string | null): void {
  timings.set(sessionKey(projectId), { startedAt: Date.now(), projectId })
}

/** Record successful export completion. */
export function recordExportSuccess(projectId?: string | null): void {
  const key = sessionKey(projectId)
  const timing = timings.get(key)
  const durationMs = timing ? Date.now() - timing.startedAt : undefined
  timings.delete(key)

  trackEvent(AnalyticsEvents.EXPORT_COMPLETED, {
    projectId,
    metadata: { success: true, duration_ms: durationMs, phase: 'export' },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.info('[export] diagnostics export_success', { projectId, durationMs })
  }
}

/** Record successful browser download. */
export function recordDownloadSuccess(projectId?: string | null): void {
  trackEvent('export_downloaded', {
    projectId,
    metadata: { success: true, asset: 'video_mp4' },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.info('[export] diagnostics download_success', { projectId })
  }
}

/** Record failed download with analytics error channel. */
export function recordDownloadFailure(
  message: string,
  projectId?: string | null,
  context?: Record<string, unknown>
): void {
  trackError('download', message, { projectId, ...context })
  trackEvent('export_downloaded', {
    projectId,
    metadata: { success: false, failure: message.slice(0, 200), asset: 'video_mp4' },
  })

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[export] diagnostics download_failure', { projectId, message })
  }
}

/** Record export pipeline failure. */
export function recordExportFailure(
  message: string,
  projectId?: string | null,
  context?: Record<string, unknown>
): void {
  timings.delete(sessionKey(projectId))
  trackError('export', message, { projectId, ...context })

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[export] diagnostics export_failure', { projectId, message })
  }
}

/** Dev-only summary of in-flight export timings. */
export function logExportDiagnosticsSummary(): void {
  if (process.env.NODE_ENV === 'production') return
  if (timings.size < 1) return
  console.info('[export] diagnostics in_flight', {
    count: timings.size,
    projects: [...timings.values()].map((t) => ({
      projectId: t.projectId,
      elapsedMs: Date.now() - t.startedAt,
    })),
  })
}
