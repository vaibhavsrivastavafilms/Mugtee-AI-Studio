import { AnalyticsEvents } from '@/lib/analytics/events'

type AnalyticsRow = {
  event: string
  user_id: string | null
  session_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type ConversionSummary = {
  funnel: {
    visitors: number
    signup_started: number
    signup_completed: number
    first_projects: number
    first_generations: number
    exports: number
    dropoff_pct: Record<string, number>
  }
  avg_generation_time_ms: number | null
  avg_step_times_ms: Record<string, number>
  returning_users: number
  top_features: { name: string; count: number }[]
  errors: {
    openai: number
    api: number
    timeout: number
    export: number
    total: number
  }
  launch: {
    activation_rate_pct: number
    export_rate_pct: number
    retention_snapshot_pct: number
  }
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

function dropoff(from: number, to: number): number {
  if (from <= 0) return 0
  return Math.round(((from - to) / from) * 1000) / 10
}

function errorCategory(meta: Record<string, unknown>): string {
  const cat = String(meta.category || meta.step || '').toLowerCase()
  const msg = String(meta.message || meta.failure || '').toLowerCase()
  if (cat.includes('openai') || msg.includes('openai')) return 'openai'
  if (cat.includes('timeout') || msg.includes('timeout') || msg.includes('timed out')) return 'timeout'
  if (cat.includes('export') || meta.step === 'export') return 'export'
  if (cat.includes('api') || msg.includes('fetch') || msg.includes('api')) return 'api'
  return 'api'
}

const FEATURE_EVENT_MAP: Record<string, string> = {
  [AnalyticsEvents.REGENERATE_HOOK]: 'regenerate_hook',
  [AnalyticsEvents.IMPROVE_HOOK_CLICKED]: 'improve_hook',
  [AnalyticsEvents.IMPROVE_SCRIPT_CLICKED]: 'improve_script',
  [AnalyticsEvents.REGENERATE_CLICKED]: 'regenerate',
  [AnalyticsEvents.REGENERATE_SCENE]: 'regenerate_scene',
  [AnalyticsEvents.REWRITE_ACTION_USED]: 'rewrite',
  [AnalyticsEvents.STORYBOARD_VIEWED]: 'storyboard',
  [AnalyticsEvents.DIRECTOR_MODE_OPENED]: 'director',
  [AnalyticsEvents.EXPORT_STARTED]: 'export',
  [AnalyticsEvents.RESUME_GENERATION]: 'resume',
}

export function computeConversionSummary(events: AnalyticsRow[]): ConversionSummary {
  const counts: Record<string, number> = {}
  const usersByEvent: Record<string, Set<string>> = {}
  const sessions = new Set<string>()
  const userDays = new Map<string, Set<string>>()
  const stepDurations: Record<string, number[]> = {}
  const genDurations: number[] = []
  const featureCounts: Record<string, number> = {}
  const errors = { openai: 0, api: 0, timeout: 0, export: 0, total: 0 }

  for (const ev of events) {
    counts[ev.event] = (counts[ev.event] || 0) + 1
    if (ev.session_id) sessions.add(ev.session_id)
    if (ev.user_id) {
      if (!usersByEvent[ev.event]) usersByEvent[ev.event] = new Set()
      usersByEvent[ev.event].add(ev.user_id)
      const day = ev.created_at.slice(0, 10)
      if (!userDays.has(ev.user_id)) userDays.set(ev.user_id, new Set())
      userDays.get(ev.user_id)!.add(day)
    }

    const meta = (ev.metadata || {}) as Record<string, unknown>

    if (ev.event === AnalyticsEvents.GENERATION_STEP_PERF) {
      const section = String(meta.section || meta.generationStep || 'unknown')
      const ms = typeof meta.duration_ms === 'number' ? meta.duration_ms : null
      if (ms && ms > 0) {
        if (!stepDurations[section]) stepDurations[section] = []
        stepDurations[section].push(ms)
      }
    }

    if (
      ev.event === AnalyticsEvents.GENERATION_COMPLETED ||
      ev.event === AnalyticsEvents.FIRST_GENERATION_COMPLETED
    ) {
      const ms = typeof meta.duration_ms === 'number' ? meta.duration_ms : null
      if (ms && ms > 0) genDurations.push(ms)
    }

    const featureKey = FEATURE_EVENT_MAP[ev.event]
    if (featureKey) {
      featureCounts[featureKey] = (featureCounts[featureKey] || 0) + 1
    }

    if (ev.event === AnalyticsEvents.ANALYTICS_ERROR) {
      errors.total++
      const bucket = errorCategory(meta)
      errors[bucket]++
    }

    if (ev.event === AnalyticsEvents.GENERATION_FAILED) {
      errors.total++
      const bucket = errorCategory({ ...meta, step: meta.step })
      errors[bucket]++
    }
  }

  const visitors =
    sessions.size ||
    counts[AnalyticsEvents.LANDING_PAGE_VIEWED] ||
    counts[AnalyticsEvents.HOMEPAGE_VISIT] ||
    counts['visitor_opened_site'] ||
    0

  const signupStarted =
    counts[AnalyticsEvents.SIGNUP_STARTED] ||
    (usersByEvent[AnalyticsEvents.SIGNUP_STARTED]?.size ?? 0)
  const signupCompleted = usersByEvent[AnalyticsEvents.SIGNUP_COMPLETED]?.size ?? 0
  const firstProjects =
    usersByEvent[AnalyticsEvents.FIRST_PROJECT_CREATED]?.size ??
    usersByEvent[AnalyticsEvents.PROJECT_CREATED]?.size ??
    0
  const firstGenerations =
    usersByEvent[AnalyticsEvents.FIRST_GENERATION_COMPLETED]?.size ??
    usersByEvent[AnalyticsEvents.GENERATION_COMPLETED]?.size ??
    0
  const exports =
    usersByEvent[AnalyticsEvents.PROJECT_EXPORTED]?.size ??
    usersByEvent[AnalyticsEvents.EXPORT_COMPLETED]?.size ??
    counts[AnalyticsEvents.EXPORT_COMPLETED] ??
    0

  const returningUsers = [...userDays.values()].filter((days) => days.size >= 2).length

  const avgStepTimes: Record<string, number> = {}
  for (const [section, values] of Object.entries(stepDurations)) {
    avgStepTimes[section] = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  const topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const signups = Math.max(signupCompleted, signupStarted)

  return {
    funnel: {
      visitors,
      signup_started: signupStarted,
      signup_completed: signupCompleted,
      first_projects: firstProjects,
      first_generations: firstGenerations,
      exports,
      dropoff_pct: {
        visitors_to_signup: dropoff(visitors, signups),
        signup_to_project: dropoff(signups, firstProjects),
        project_to_generation: dropoff(firstProjects, firstGenerations),
        generation_to_export: dropoff(firstGenerations, exports),
      },
    },
    avg_generation_time_ms:
      genDurations.length > 0
        ? Math.round(genDurations.reduce((a, b) => a + b, 0) / genDurations.length)
        : null,
    avg_step_times_ms: avgStepTimes,
    returning_users: returningUsers,
    top_features: topFeatures,
    errors,
    launch: {
      activation_rate_pct: pct(firstGenerations, Math.max(signups, 1)),
      export_rate_pct: pct(exports, Math.max(firstGenerations, 1)),
      retention_snapshot_pct: pct(
        returningUsers,
        Math.max(userDays.size, 1)
      ),
    },
  }
}
