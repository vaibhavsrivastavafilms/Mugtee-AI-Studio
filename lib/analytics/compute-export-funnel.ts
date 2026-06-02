import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { projectIdFromMetadata } from '@/lib/analytics/events'

export type AnalyticsEventRow = {
  event: string
  user_id: string | null
  session_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type Mp4ErrorBreakdownRow = {
  error_code: string
  count: number
  latest_message: string | null
}

export type ExportFunnelDailyRow = {
  date: string
  signups: number
  projects: number
  storyboards: number
  export_clicks: number
  mp4_started: number
  mp4_completed: number
  mp4_downloaded: number
  mp4_failed: number
  success_rate_pct: number
}

export type ExportFunnelSummary = {
  window_days: number
  totals: {
    signups: number
    projects: number
    storyboards: number
    export_clicks: number
    mp4_started: number
    mp4_completed: number
    mp4_downloaded: number
    mp4_failed: number
    success_rate_pct: number
    click_to_download_pct: number
  }
  daily: ExportFunnelDailyRow[]
  top_errors: Mp4ErrorBreakdownRow[]
  top_failure: Mp4ErrorBreakdownRow | null
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function countEvents(events: AnalyticsEventRow[], eventName: string, sinceDay?: string): number {
  let n = 0
  for (const e of events) {
    if (e.event !== eventName) continue
    if (sinceDay && dayKey(e.created_at) !== sinceDay) continue
    n++
  }
  return n
}

function successRate(completed: number, started: number): number {
  if (started <= 0) return 0
  return Math.round((completed / started) * 1000) / 10
}

function aggregateErrors(events: AnalyticsEventRow[]): Mp4ErrorBreakdownRow[] {
  const map = new Map<string, { count: number; latest_message: string | null; latest_at: string }>()
  for (const e of events) {
    if (e.event !== Mp4ExportEvents.MP4_FAILED) continue
    const meta = e.metadata ?? {}
    const code =
      typeof meta.error_code === 'string' && meta.error_code.trim()
        ? meta.error_code.trim()
        : 'Export Request Failed'
    const message =
      typeof meta.message === 'string' && meta.message.trim() ? meta.message.trim() : null
    const prev = map.get(code)
    if (!prev) {
      map.set(code, { count: 1, latest_message: message, latest_at: e.created_at })
    } else {
      prev.count++
      if (e.created_at >= prev.latest_at) {
        prev.latest_at = e.created_at
        prev.latest_message = message ?? prev.latest_message
      }
    }
  }
  return [...map.entries()]
    .map(([error_code, v]) => ({
      error_code,
      count: v.count,
      latest_message: v.latest_message,
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeExportFunnel(
  events: AnalyticsEventRow[],
  windowDays: number
): ExportFunnelSummary {
  const signupEvents = new Set([
    Mp4ExportEvents.USER_SIGNUP,
    'signup_completed',
    'user_signup',
  ])
  const projectEvents = new Set([
    Mp4ExportEvents.PROJECT_CREATED,
    'project_created',
    'first_project_created',
    'new_project_created',
  ])
  const storyboardEvents = new Set([
    Mp4ExportEvents.STORYBOARD_GENERATED,
    'storyboard_generated',
    'storyboard_viewed',
  ])

  const days: string[] = []
  const now = new Date()
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  const daily: ExportFunnelDailyRow[] = days.map((date) => {
    const signups = events.filter(
      (e) => signupEvents.has(e.event) && dayKey(e.created_at) === date && e.user_id
    ).length
    const projects = events.filter(
      (e) => projectEvents.has(e.event) && dayKey(e.created_at) === date
    ).length
    const storyboards = events.filter(
      (e) => storyboardEvents.has(e.event) && dayKey(e.created_at) === date
    ).length
    const export_clicks = countEvents(events, Mp4ExportEvents.EXPORT_CLICKED, date)
    const mp4_started = countEvents(events, Mp4ExportEvents.MP4_STARTED, date)
    const mp4_completed = countEvents(events, Mp4ExportEvents.MP4_COMPLETED, date)
    const mp4_downloaded = countEvents(events, Mp4ExportEvents.MP4_DOWNLOADED, date)
    const mp4_failed = countEvents(events, Mp4ExportEvents.MP4_FAILED, date)
    return {
      date,
      signups,
      projects,
      storyboards,
      export_clicks,
      mp4_started,
      mp4_completed,
      mp4_downloaded,
      mp4_failed,
      success_rate_pct: successRate(mp4_downloaded, mp4_started),
    }
  })

  const totals = {
    signups: events.filter((e) => signupEvents.has(e.event) && e.user_id).length,
    projects: events.filter((e) => projectEvents.has(e.event)).length,
    storyboards: events.filter((e) => storyboardEvents.has(e.event)).length,
    export_clicks: countEvents(events, Mp4ExportEvents.EXPORT_CLICKED),
    mp4_started: countEvents(events, Mp4ExportEvents.MP4_STARTED),
    mp4_completed: countEvents(events, Mp4ExportEvents.MP4_COMPLETED),
    mp4_downloaded: countEvents(events, Mp4ExportEvents.MP4_DOWNLOADED),
    mp4_failed: countEvents(events, Mp4ExportEvents.MP4_FAILED),
    success_rate_pct: 0,
    click_to_download_pct: 0,
  }
  totals.success_rate_pct = successRate(totals.mp4_downloaded, totals.mp4_started)
  totals.click_to_download_pct = successRate(totals.mp4_downloaded, totals.export_clicks)

  const top_errors = aggregateErrors(events)

  return {
    window_days: windowDays,
    totals,
    daily,
    top_errors,
    top_failure: top_errors[0] ?? null,
  }
}

/** Distinct projects that reached a funnel step (for debugging). */
export function distinctProjectIdsForEvent(
  events: AnalyticsEventRow[],
  eventName: string
): string[] {
  const ids = new Set<string>()
  for (const e of events) {
    if (e.event !== eventName) continue
    const pid = projectIdFromMetadata(e.metadata)
    if (pid) ids.add(pid)
  }
  return [...ids]
}
