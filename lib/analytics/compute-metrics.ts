import {
  AnalyticsEvents,
  projectIdFromMetadata,
  type FeedbackRating,
} from '@/lib/analytics/events'
import { computeTrustScore, type TrustScoreInputs } from '@/lib/analytics/trust-score'

type AnalyticsRow = {
  event: string
  user_id: string | null
  session_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type FeedbackRow = {
  rating: string
  user_id: string
  project_id: string | null
  created_at: string
}

export type CreatorValidationMetrics = {
  window_days: number
  total_creators: number
  dau: number
  projects_created: number
  generation_success_rate: number
  resume_success_rate: number
  export_rate: number
  avg_generation_time_ms: number | null
  avg_projects_per_creator: number
  funnel: {
    landing: number
    signup: number
    first_project: number
    first_generation: number
    storyboard: number
    export: number
    return: number
    dropoff_pct: Record<string, number>
    conversion_pct: Record<string, number>
  }
  top_niche: { name: string; count: number } | null
  top_duration: { seconds: number; count: number } | null
  highest_rated_outputs: { rating: string; count: number }[]
  events_by_type: Record<string, number>
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

function dropoff(from: number, to: number): number {
  if (from <= 0) return 0
  return Math.round(((from - to) / from) * 1000) / 10
}

export function computeCreatorValidationMetrics(
  events: AnalyticsRow[],
  feedback: FeedbackRow[],
  projectCountByUser: Record<string, number>,
  windowDays: number
): CreatorValidationMetrics {
  const counts: Record<string, number> = {}
  const usersByEvent: Record<string, Set<string>> = {}
  const landingSessions = new Set<string>()
  const genDurations: number[] = []
  const nicheCounts: Record<string, number> = {}
  const durationCounts: Record<number, number> = {}
  const genStartedAt = new Map<string, number>()

  for (const ev of events) {
    counts[ev.event] = (counts[ev.event] || 0) + 1
    if (ev.user_id) {
      if (!usersByEvent[ev.event]) usersByEvent[ev.event] = new Set()
      usersByEvent[ev.event].add(ev.user_id)
    }
    if (
      ev.event === AnalyticsEvents.HOMEPAGE_VISIT ||
      ev.event === 'visitor_opened_site'
    ) {
      if (ev.session_id) landingSessions.add(ev.session_id)
    }
    const meta = (ev.metadata || {}) as Record<string, unknown>
    if (typeof meta.niche === 'string') {
      const n = meta.niche.toLowerCase()
      nicheCounts[n] = (nicheCounts[n] || 0) + 1
    }
    if (typeof meta.duration === 'number') {
      durationCounts[meta.duration] = (durationCounts[meta.duration] || 0) + 1
    }
    const projectId = projectIdFromMetadata(meta)
    if (ev.event === AnalyticsEvents.GENERATION_STARTED && ev.user_id) {
      const key = `${ev.user_id}:${projectId || 'none'}`
      genStartedAt.set(key, new Date(ev.created_at).getTime())
    }
    if (ev.event === AnalyticsEvents.GENERATION_COMPLETED && ev.user_id) {
      const key = `${ev.user_id}:${projectId || 'none'}`
      const started = genStartedAt.get(key)
      const ms = typeof meta.duration_ms === 'number' ? meta.duration_ms : null
      if (ms && ms > 0) genDurations.push(ms)
      else if (started) genDurations.push(Date.now() - started)
    }
  }

  const uniqueUsers = new Set(events.filter((e) => e.user_id).map((e) => e.user_id!))
  const today = new Date().toISOString().slice(0, 10)
  const dauUsers = new Set(
    events
      .filter((e) => e.user_id && e.created_at.slice(0, 10) === today)
      .map((e) => e.user_id!)
  )

  const landed = landingSessions.size || counts[AnalyticsEvents.HOMEPAGE_VISIT] || counts['visitor_opened_site'] || 0
  const signup = usersByEvent[AnalyticsEvents.SIGNUP_COMPLETED]?.size ?? 0
  const firstProject = usersByEvent[AnalyticsEvents.PROJECT_CREATED]?.size ?? 0
  const firstGen = usersByEvent[AnalyticsEvents.GENERATION_COMPLETED]?.size ?? 0
  const storyboard = usersByEvent[AnalyticsEvents.STORYBOARD_VIEWED]?.size ?? 0
  const exportDone = usersByEvent[AnalyticsEvents.EXPORT_COMPLETED]?.size ?? 0

  const genStarted = counts[AnalyticsEvents.GENERATION_STARTED] || 0
  const genCompleted = counts[AnalyticsEvents.GENERATION_COMPLETED] || 0
  const genFailed = counts[AnalyticsEvents.GENERATION_FAILED] || 0
  const resumeStarted = counts[AnalyticsEvents.RESUME_GENERATION] || 0
  const exportStarted = counts[AnalyticsEvents.EXPORT_STARTED] || 0
  const exportCompleted = counts[AnalyticsEvents.EXPORT_COMPLETED] || 0

  const projectTotal = Object.values(projectCountByUser).reduce((a, b) => a + b, 0)
  const creatorCount = Math.max(uniqueUsers.size, 1)

  const ratingCounts: Record<string, number> = {}
  for (const f of feedback) {
    ratingCounts[f.rating] = (ratingCounts[f.rating] || 0) + 1
  }

  const topNiche = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]
  const topDuration = Object.entries(durationCounts).sort((a, b) => b[1] - a[1])[0]

  return {
    window_days: windowDays,
    total_creators: uniqueUsers.size,
    dau: dauUsers.size,
    projects_created: counts[AnalyticsEvents.PROJECT_CREATED] || projectTotal,
    generation_success_rate: pct(genCompleted, genStarted + genFailed),
    resume_success_rate: pct(genCompleted, resumeStarted || genStarted),
    export_rate: pct(exportCompleted, exportStarted || genCompleted),
    avg_generation_time_ms:
      genDurations.length > 0
        ? Math.round(genDurations.reduce((a, b) => a + b, 0) / genDurations.length)
        : null,
    avg_projects_per_creator: Math.round((projectTotal / creatorCount) * 10) / 10,
    funnel: {
      landing: landed,
      signup,
      first_project: firstProject,
      first_generation: firstGen,
      storyboard,
      export: exportDone,
      return: 0,
      dropoff_pct: {
        landing_to_signup: dropoff(landed, signup),
        signup_to_project: dropoff(signup, firstProject),
        project_to_generation: dropoff(firstProject, firstGen),
        generation_to_storyboard: dropoff(firstGen, storyboard),
        storyboard_to_export: dropoff(storyboard, exportDone),
      },
      conversion_pct: {
        landing_to_signup: pct(signup, landed),
        signup_to_export: pct(exportDone, signup),
        generation_to_export: pct(exportDone, firstGen),
      },
    },
    top_niche: topNiche ? { name: topNiche[0], count: topNiche[1] } : null,
    top_duration: topDuration
      ? { seconds: Number(topDuration[0]), count: topDuration[1] }
      : null,
    highest_rated_outputs: Object.entries(ratingCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([rating, count]) => ({ rating, count })),
    events_by_type: counts,
  }
}

export function trustInputsFromEvents(
  events: AnalyticsRow[],
  feedbackRatings: FeedbackRating[]
): TrustScoreInputs {
  const count = (name: string) => events.filter((e) => e.event === name).length
  return {
    generationStarted: count(AnalyticsEvents.GENERATION_STARTED),
    generationCompleted: count(AnalyticsEvents.GENERATION_COMPLETED),
    generationFailed: count(AnalyticsEvents.GENERATION_FAILED),
    resumeStarted: count(AnalyticsEvents.RESUME_GENERATION),
    resumeCompleted: count(AnalyticsEvents.GENERATION_COMPLETED),
    exportStarted: count(AnalyticsEvents.EXPORT_STARTED),
    exportCompleted: count(AnalyticsEvents.EXPORT_COMPLETED),
    feedbackRatings,
  }
}
