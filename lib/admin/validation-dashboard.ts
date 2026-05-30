/** Phase 7 — 30-day founder validation metrics (admin-only, service role). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { aggregateFeatureRequests } from '@/lib/admin/feature-request-aggregation'
import { topCounts, type RankedCount } from '@/lib/admin/founder-dashboard-metrics'
import { FeatureUsageFeatures } from '@/lib/analytics/feature-usage'
import {
  computeRevenueValidationMetrics,
  type RevenueValidationMetrics,
} from '@/lib/analytics/revenue-validation'

export type ValidationDashboardMetrics = {
  window_days: number
  generated_at: string
  users: {
    new_today: number
    new_this_week: number
    new_this_month: number
    active_7d: number
    active_30d: number
    total_all_time: number
  }
  activity: {
    projects_created_window: number
    projects_created_all_time: number
    exports_downloaded_window: number
    exports_downloaded_all_time: number
    videos_generated_window: number
    videos_generated_all_time: number
  }
  retention: {
    returning_users_pct: number | null
    users_with_2plus_projects: number
    users_with_any_project: number
  }
  upgrade_intent: {
    waitlist_total: number
    waitlist_in_window: number
    by_plan: RankedCount[]
    table_available: boolean
  }
  revenue_funnel: RevenueValidationMetrics
  top_features: {
    source: 'feature_usage_events' | 'profile_counters'
    most_used: RankedCount[]
    least_used: RankedCount[]
  }
  feedback: {
    most_requested_features: RankedCount[]
    most_common_complaints: RankedCount[]
    most_loved: Array<{ comment: string; rating: number; created_at: string }>
  }
  founder_summary: {
    growth_wow_pct: number | null
    new_users_this_week: number
    new_users_prior_week: number
    retention_pct: number | null
    revenue_signals: string[]
    product_signals: string[]
    report_text: string
  }
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d = new Date()): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? 6 : day - 1
  x.setDate(x.getDate() - diff)
  return x
}

function startOfPreviousWeek(d = new Date()): Date {
  const x = startOfWeek(d)
  x.setDate(x.getDate() - 7)
  return x
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function windowStart(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

async function countExact(db: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function countSince(db: SupabaseClient, table: string, since: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

async function tableExists(db: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('*', { count: 'exact', head: true }).limit(1)
  if (!error) return true
  const msg = (error.message || '').toLowerCase()
  return !(
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    error.code === '42P01'
  )
}

function activeUserSet(
  profileRows: Array<{ id?: string }>,
  projectRows: Array<{ user_id?: string }>
): Set<string> {
  const set = new Set<string>()
  for (const p of profileRows) {
    if (p.id) set.add(p.id)
  }
  for (const p of projectRows) {
    if (p.user_id) set.add(p.user_id)
  }
  return set
}

function countVideosInRows(
  rows: Array<{ script?: unknown; video_url?: unknown; reel_url?: unknown }>
): number {
  let n = 0
  for (const row of rows) {
    const videoUrl = row.video_url as string | null | undefined
    const reelUrl = row.reel_url as string | null | undefined
    if ((videoUrl && videoUrl.trim()) || (reelUrl && reelUrl.trim())) n += 1
  }
  return n
}

function profileFeatureFallback(
  rows: Array<{
    projects_count?: number | null
    generations_count?: number | null
    exports_count?: number | null
    renders_count?: number | null
  }>
): RankedCount[] {
  const totals: Record<string, number> = {
    projects: 0,
    generations: 0,
    exports: 0,
    renders: 0,
  }
  for (const row of rows) {
    totals.projects += Number(row.projects_count) || 0
    totals.generations += Number(row.generations_count) || 0
    totals.exports += Number(row.exports_count) || 0
    totals.renders += Number(row.renders_count) || 0
  }
  return topCounts(totals, 20)
}

function invertLeastUsed(ranked: RankedCount[], limit = 8): RankedCount[] {
  const nonzero = ranked.filter((r) => r.count > 0)
  if (nonzero.length === 0) return []
  const sorted = [...nonzero].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name))
  return sorted.slice(0, limit)
}

function buildReportText(summary: ValidationDashboardMetrics['founder_summary']): string {
  const lines = [
    'Mugtee AI Studio — Founder Weekly Summary',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Growth',
    `New users this week: ${summary.new_users_this_week}`,
    `Prior week: ${summary.new_users_prior_week}`,
    summary.growth_wow_pct !== null
      ? `Week-over-week: ${summary.growth_wow_pct > 0 ? '+' : ''}${summary.growth_wow_pct}%`
      : 'Week-over-week: n/a',
    '',
    '## Retention',
    summary.retention_pct !== null
      ? `Returning users (2+ projects): ${summary.retention_pct}%`
      : 'Returning users: n/a',
    '',
    '## Revenue signals',
    ...summary.revenue_signals.map((s) => `- ${s}`),
    '',
    '## Product direction',
    ...summary.product_signals.map((s) => `- ${s}`),
  ]
  return lines.join('\n')
}

export async function computeValidationDashboardMetrics(
  db: SupabaseClient,
  windowDays = 30
): Promise<ValidationDashboardMetrics> {
  const days = Math.min(90, Math.max(7, windowDays))
  const now = new Date()
  const sinceWindow = windowStart(days, now)
  const sevenDaysAgo = windowStart(7, now)
  const thirtyDaysAgo = windowStart(30, now)
  const todayStart = startOfDay(now).toISOString()
  const weekStart = startOfWeek(now).toISOString()
  const prevWeekStart = startOfPreviousWeek(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()

  const [
    totalUsers,
    newToday,
    newWeek,
    newMonth,
    newPriorWeek,
    projectsAllTime,
    projectsWindow,
    exportsAllTimeRows,
    active7dProfiles,
    active7dProjects,
    active30dProfiles,
    active30dProjects,
    projectsUsageSample,
    projectsWindowRows,
    retentionProjectRows,
    feedbackRows,
    foundingRows,
    featureEventsAvailable,
    upgradeAvailable,
  ] = await Promise.all([
    countExact(db, 'profiles'),
    countSince(db, 'profiles', todayStart),
    countSince(db, 'profiles', weekStart),
    countSince(db, 'profiles', monthStart),
    db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevWeekStart)
      .lt('created_at', weekStart),
    countExact(db, 'cinematic_projects'),
    countSince(db, 'cinematic_projects', sinceWindow),
    db.from('profiles').select('exports_count'),
    db.from('profiles').select('id').gte('updated_at', sevenDaysAgo),
    db.from('cinematic_projects').select('user_id').gte('updated_at', sevenDaysAgo),
    db.from('profiles').select('id').gte('updated_at', thirtyDaysAgo),
    db.from('cinematic_projects').select('user_id').gte('updated_at', thirtyDaysAgo),
    db
      .from('cinematic_projects')
      .select('video_url, reel_url')
      .limit(15000),
    db
      .from('cinematic_projects')
      .select('video_url, reel_url, created_at')
      .gte('created_at', sinceWindow)
      .limit(15000),
    db.from('cinematic_projects').select('user_id').limit(20000),
    db
      .from('project_feedback')
      .select('rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
    db
      .from('founding_creator_applications')
      .select('requested_features, pain_points, feedback')
      .limit(500),
    tableExists(db, 'feature_usage_events'),
    tableExists(db, 'upgrade_waitlist'),
  ])

  const active7d = activeUserSet(
    active7dProfiles.data || [],
    active7dProjects.data || []
  ).size
  const active30d = activeUserSet(
    active30dProfiles.data || [],
    active30dProjects.data || []
  ).size

  const exportsAllTime = (exportsAllTimeRows.data || []).reduce(
    (sum, r) => sum + (Number(r.exports_count) || 0),
    0
  )

  let exportsWindow = 0
  const exportEventsAvailable = await tableExists(db, 'analytics_events')
  if (exportEventsAvailable) {
    const { count } = await db
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event', 'export_completed')
      .gte('created_at', sinceWindow)
    exportsWindow = count ?? 0
  } else {
    exportsWindow = exportsAllTime
  }

  const videosAllTime = countVideosInRows(projectsUsageSample.data || [])
  const videosWindow = countVideosInRows(projectsWindowRows.data || [])

  const projectsByUser: Record<string, number> = {}
  for (const row of retentionProjectRows.data || []) {
    if (!row.user_id) continue
    projectsByUser[row.user_id] = (projectsByUser[row.user_id] || 0) + 1
  }
  const usersWithAny = Object.keys(projectsByUser).length
  const users2Plus = Object.values(projectsByUser).filter((n) => n >= 2).length
  const returningPct =
    usersWithAny > 0 ? Math.round((users2Plus / usersWithAny) * 1000) / 10 : null

  let mostUsed: RankedCount[] = []
  let leastUsed: RankedCount[] = []
  let featureSource: ValidationDashboardMetrics['top_features']['source'] = 'profile_counters'

  if (featureEventsAvailable) {
    const { data: eventRows } = await db
      .from('feature_usage_events')
      .select('feature')
      .gte('created_at', sinceWindow)
      .limit(20000)

    const counts: Record<string, number> = {}
    for (const row of eventRows || []) {
      const f = (row.feature || 'unknown').trim()
      counts[f] = (counts[f] || 0) + 1
    }
    mostUsed = topCounts(counts, 12)
    leastUsed = invertLeastUsed(mostUsed, 8)
    featureSource = 'feature_usage_events'
  } else {
    const { data: profileRows } = await db
      .from('profiles')
      .select('projects_count, generations_count, exports_count, renders_count')
      .limit(5000)
    mostUsed = profileFeatureFallback(profileRows || [])
    leastUsed = invertLeastUsed(mostUsed, 8)
    const canonical = Object.values(FeatureUsageFeatures)
    if (mostUsed.length === 0 && canonical.length > 0) {
      mostUsed = canonical.map((name) => ({ name, count: 0 }))
      leastUsed = mostUsed.slice(0, 8)
    }
  }

  const fb = feedbackRows.data || []
  const founding = foundingRows.data || []
  const requestTexts = [
    ...fb.map((r) => r.comment || ''),
    ...founding.flatMap((r) => [
      r.requested_features || '',
      r.feedback || '',
    ]),
  ]
  const painTexts = founding
    .map((r) => r.pain_points || '')
    .filter((t) => t.trim().length > 0)

  const mostRequested = aggregateFeatureRequests(requestTexts, 12)
  const mostComplaints = aggregateFeatureRequests(painTexts, 12)

  const mostLoved = fb
    .filter((r) => Number(r.rating) >= 4 && (r.comment || '').trim().length > 8)
    .slice(0, 12)
    .map((r) => ({
      comment: (r.comment || '').trim(),
      rating: Number(r.rating),
      created_at: r.created_at,
    }))

  let waitlistTotal = 0
  let waitlistWindow = 0
  const upgradeByPlan: Record<string, number> = {}
  if (upgradeAvailable) {
    const totalRes = await db
      .from('upgrade_waitlist')
      .select('*', { count: 'exact', head: true })
    waitlistTotal = totalRes.count ?? 0

    const windowRes = await db
      .from('upgrade_waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sinceWindow)
    waitlistWindow = windowRes.count ?? 0

    const { data: planRows } = await db
      .from('upgrade_waitlist')
      .select('plan_interest')
      .limit(5000)
    for (const row of planRows || []) {
      const plan = (row.plan_interest || 'unknown').trim()
      upgradeByPlan[plan] = (upgradeByPlan[plan] || 0) + 1
    }
  }

  const newUsersPriorWeek = newPriorWeek.count ?? 0
  const growthWowPct =
    newUsersPriorWeek > 0
      ? Math.round(((newWeek - newUsersPriorWeek) / newUsersPriorWeek) * 1000) / 10
      : newWeek > 0
        ? 100
        : null

  const revenueFunnel = await computeRevenueValidationMetrics(db).catch(() => ({
    pricing_visits: 0,
    upgrade_clicks: 0,
    payment_attempts: 0,
    plan_interest_by_plan: [] as RankedCount[],
    conversion_rate: null as number | null,
    tables_available: { revenue_events: false, analytics_fallback: false },
  }))

  const revenueSignals: string[] = []
  revenueSignals.push(`Pricing visits: ${revenueFunnel.pricing_visits}`)
  revenueSignals.push(`Upgrade clicks: ${revenueFunnel.upgrade_clicks}`)
  if (revenueFunnel.conversion_rate !== null) {
    revenueSignals.push(
      `Conversion (clicks/visits): ${(revenueFunnel.conversion_rate * 100).toFixed(1)}%`
    )
  }
  revenueSignals.push(`Payment attempts: ${revenueFunnel.payment_attempts}`)
  const clickPlans = revenueFunnel.plan_interest_by_plan
    .map((p) => `${p.name}: ${p.count}`)
    .join(', ')
  if (clickPlans) revenueSignals.push(`Plan interest (clicks): ${clickPlans}`)

  if (upgradeAvailable) {
    revenueSignals.push(`Upgrade waitlist (all-time): ${waitlistTotal}`)
    revenueSignals.push(`Upgrade waitlist (last ${days}d): ${waitlistWindow}`)
    const planBreakdown = topCounts(upgradeByPlan, 5)
      .map((p) => `${p.name}: ${p.count}`)
      .join(', ')
    if (planBreakdown) revenueSignals.push(`Plan interest: ${planBreakdown}`)
  } else {
    revenueSignals.push('Upgrade waitlist unavailable — run migration 0027_upgrade_waitlist')
  }

  const productSignals: string[] = []
  if (mostUsed.length > 0) {
    productSignals.push(
      `Top features: ${mostUsed
        .slice(0, 5)
        .map((f) => `${f.name} (${f.count})`)
        .join(', ')}`
    )
  }
  if (mostRequested.length > 0) {
    productSignals.push(
      `Top requests: ${mostRequested
        .slice(0, 3)
        .map((f) => f.name)
        .join('; ')}`
    )
  }
  if (mostComplaints.length > 0) {
    productSignals.push(
      `Pain themes: ${mostComplaints
        .slice(0, 3)
        .map((f) => f.name)
        .join('; ')}`
    )
  }

  const founderSummary = {
    growth_wow_pct: growthWowPct,
    new_users_this_week: newWeek,
    new_users_prior_week: newUsersPriorWeek,
    retention_pct: returningPct,
    revenue_signals: revenueSignals,
    product_signals: productSignals,
    report_text: '',
  }
  founderSummary.report_text = buildReportText(founderSummary)

  return {
    window_days: days,
    generated_at: now.toISOString(),
    users: {
      new_today: newToday,
      new_this_week: newWeek,
      new_this_month: newMonth,
      active_7d: active7d,
      active_30d: active30d,
      total_all_time: totalUsers,
    },
    activity: {
      projects_created_window: projectsWindow,
      projects_created_all_time: projectsAllTime,
      exports_downloaded_window: exportsWindow,
      exports_downloaded_all_time: exportsAllTime,
      videos_generated_window: videosWindow,
      videos_generated_all_time: videosAllTime,
    },
    retention: {
      returning_users_pct: returningPct,
      users_with_2plus_projects: users2Plus,
      users_with_any_project: usersWithAny,
    },
    upgrade_intent: {
      waitlist_total: waitlistTotal,
      waitlist_in_window: waitlistWindow,
      by_plan: topCounts(upgradeByPlan),
      table_available: upgradeAvailable,
    },
    revenue_funnel: revenueFunnel,
    top_features: {
      source: featureSource,
      most_used: mostUsed,
      least_used: leastUsed,
    },
    feedback: {
      most_requested_features: mostRequested,
      most_common_complaints: mostComplaints,
      most_loved: mostLoved,
    },
    founder_summary: founderSummary,
  }
}
