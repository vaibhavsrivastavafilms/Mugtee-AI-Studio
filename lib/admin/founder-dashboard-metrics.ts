import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeRevenueValidationMetrics,
  type RevenueValidationMetrics,
} from '@/lib/analytics/revenue-validation'

export type RankedCount = { name: string; count: number }

export type GrowthEngineKpis = {
  weekly_active_users: number
  projects_created: number
  projects_created_this_week: number
  projects_created_last_week: number
  projects_week_over_week_pct: number | null
  exports_downloaded: number
  retention_users_2plus_projects: number
  upgrade_intent: number
}

export type FounderDashboardMetrics = {
  growth_kpis: GrowthEngineKpis
  overview: {
    total_users: number
    active_users_7d: number
    projects_created: number
    scripts_generated: number
    videos_generated: number
    exports_downloaded: number
    creator_packs_note: string
  }
  growth: {
    new_users_today: number
    new_users_this_week: number
    new_users_this_month: number
  }
  usage: {
    top_templates: RankedCount[]
    top_niches: RankedCount[]
    top_director_modes: RankedCount[]
    content_types: RankedCount[]
  }
  retention: {
    returning_users: number
    projects_per_user_avg: number
    avg_generations_per_user: number
  }
  feedback: {
    avg_rating: number | null
    total_feedback: number
    latest: Array<{
      id: string
      rating: number
      comment: string | null
      created_at: string
    }>
    feature_requests: string[]
    founding_creator_applications: number
  }
  monetization: {
    upgrade_waitlist_total: number
    upgrade_waitlist_by_plan: RankedCount[]
    referral_signups: number
    revenue_validation: RevenueValidationMetrics
    tables_available: { upgrade_waitlist: boolean; referrals: boolean }
  }
  generated_at: string
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

export function topCounts(
  counts: Record<string, number>,
  limit = 10,
  unknownLabel = 'unknown'
): RankedCount[] {
  return Object.entries(counts)
    .map(([name, count]) => ({
      name: name || unknownLabel,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function bump(map: Record<string, number>, key: string | null | undefined) {
  const k = (key || '').trim() || 'unknown'
  map[k] = (map[k] || 0) + 1
}

function parseCaptionsFields(captions: unknown): {
  blueprintId?: string
  niche?: string
  directorMode?: string
} {
  if (!captions || typeof captions !== 'object') return {}
  const c = captions as Record<string, unknown>
  return {
    blueprintId:
      typeof c.blueprintId === 'string'
        ? c.blueprintId
        : c.blueprintId === null
          ? 'none'
          : undefined,
    niche: typeof c.niche === 'string' ? c.niche : undefined,
    directorMode: typeof c.directorMode === 'string' ? c.directorMode : undefined,
  }
}

async function countExact(db: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function countProfilesSince(db: SupabaseClient, since: string): Promise<number> {
  const { count, error } = await db
    .from('profiles')
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

export async function computeFounderDashboardMetrics(
  db: SupabaseClient
): Promise<FounderDashboardMetrics> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = startOfDay(now).toISOString()
  const weekStart = startOfWeek(now).toISOString()
  const prevWeekStart = startOfPreviousWeek(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    projectsCreated,
    projectsThisWeekRes,
    projectsLastWeekRes,
    exportsSum,
    profilesForGenerations,
    activeProfiles,
    activeProjectUsers,
    projectsForUsage,
    projectsForRetention,
    feedbackRows,
    foundingAppsCount,
    upgradeAvailable,
    referralsAvailable,
  ] = await Promise.all([
    countExact(db, 'profiles'),
    countProfilesSince(db, todayStart),
    countProfilesSince(db, weekStart),
    countProfilesSince(db, monthStart),
    countExact(db, 'cinematic_projects'),
    db
      .from('cinematic_projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart),
    db
      .from('cinematic_projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevWeekStart)
      .lt('created_at', weekStart),
    db.from('profiles').select('exports_count, generations_count'),
    db.from('profiles').select('generations_count'),
    db.from('profiles').select('id').gte('updated_at', sevenDaysAgo),
    db.from('cinematic_projects').select('user_id').gte('updated_at', sevenDaysAgo),
    db
      .from('cinematic_projects')
      .select('captions, mode, input_type, script, video_url, reel_url, user_id, created_at, updated_at')
      .limit(15000),
    db.from('cinematic_projects').select('user_id, created_at, updated_at').limit(20000),
    db
      .from('project_feedback')
      .select('id, rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    countExact(db, 'founding_creator_applications').catch(() => 0),
    tableExists(db, 'upgrade_waitlist'),
    tableExists(db, 'referrals'),
  ])

  let scriptsGenerated = 0
  let videosGenerated = 0
  const templateCounts: Record<string, number> = {}
  const nicheCounts: Record<string, number> = {}
  const directorCounts: Record<string, number> = {}
  const contentTypeCounts: Record<string, number> = {}

  const usageRows = projectsForUsage.data || []
  for (const row of usageRows) {
    const script = typeof row.script === 'string' ? row.script.trim() : ''
    if (script.length > 0) scriptsGenerated += 1

    const videoUrl = row.video_url as string | null | undefined
    const reelUrl = row.reel_url as string | null | undefined
    if ((videoUrl && videoUrl.trim()) || (reelUrl && reelUrl.trim())) videosGenerated += 1

    const caps = parseCaptionsFields(row.captions)
    bump(templateCounts, caps.blueprintId ?? 'none')
    bump(nicheCounts, caps.niche)
    bump(directorCounts, caps.directorMode)
    bump(contentTypeCounts, (row.mode as string) || 'unknown')
    if (row.input_type) {
      bump(contentTypeCounts, `input:${row.input_type}`)
    }
  }

  const activeSet = new Set<string>()
  for (const p of activeProfiles.data || []) {
    if (p.id) activeSet.add(p.id)
  }
  for (const p of activeProjectUsers.data || []) {
    if (p.user_id) activeSet.add(p.user_id)
  }

  const exportsRows = exportsSum.data || []
  const exportsDownloaded = exportsRows.reduce(
    (sum, r) => sum + (Number(r.exports_count) || 0),
    0
  )
  const genRows = profilesForGenerations.data || []
  const avgGenerations =
    genRows.length > 0
      ? genRows.reduce((s, r) => s + (Number(r.generations_count) || 0), 0) / genRows.length
      : 0

  const projectsByUser: Record<string, number> = {}
  const retentionRows = projectsForRetention.data || []
  for (const row of retentionRows) {
    if (!row.user_id) continue
    projectsByUser[row.user_id] = (projectsByUser[row.user_id] || 0) + 1
  }
  const usersWithProjects = Object.keys(projectsByUser).length
  const returningUsers = Object.values(projectsByUser).filter((n) => n >= 2).length
  const totalProjectRows = retentionRows.length
  const projectsPerUserAvg =
    usersWithProjects > 0 ? Math.round((totalProjectRows / usersWithProjects) * 100) / 100 : 0

  const fb = feedbackRows.data || []
  const ratings = fb.map((r) => Number(r.rating)).filter((n) => !Number.isNaN(n))
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
      : null

  const featureRequests = fb
    .map((r) => (r.comment || '').trim())
    .filter((c) => c.length > 12)
    .slice(0, 15)

  let upgradeWaitlistTotal = 0
  const upgradeByPlan: Record<string, number> = {}
  if (upgradeAvailable) {
    const { count } = await db
      .from('upgrade_waitlist')
      .select('*', { count: 'exact', head: true })
    upgradeWaitlistTotal = count ?? 0

    const { data: waitlistRows } = await db
      .from('upgrade_waitlist')
      .select('plan_interest')
      .limit(5000)
    for (const row of waitlistRows || []) {
      bump(upgradeByPlan, row.plan_interest)
    }
  }

  let referralSignups = 0
  if (referralsAvailable) {
    referralSignups = await countExact(db, 'referrals')
  }

  const revenueValidation = await computeRevenueValidationMetrics(db).catch(() => ({
    pricing_visits: 0,
    upgrade_clicks: 0,
    payment_attempts: 0,
    plan_interest_by_plan: [] as RankedCount[],
    conversion_rate: null as number | null,
    tables_available: { revenue_events: false, analytics_fallback: false },
  }))

  const projectsThisWeek = projectsThisWeekRes.count ?? 0
  const projectsLastWeek = projectsLastWeekRes.count ?? 0
  const projectsWowPct =
    projectsLastWeek > 0
      ? Math.round(((projectsThisWeek - projectsLastWeek) / projectsLastWeek) * 1000) / 10
      : projectsThisWeek > 0
        ? 100
        : null

  return {
    growth_kpis: {
      weekly_active_users: activeSet.size,
      projects_created: projectsCreated,
      projects_created_this_week: projectsThisWeek,
      projects_created_last_week: projectsLastWeek,
      projects_week_over_week_pct: projectsWowPct,
      exports_downloaded: exportsDownloaded,
      retention_users_2plus_projects: returningUsers,
      upgrade_intent: upgradeWaitlistTotal,
    },
    overview: {
      total_users: totalUsers,
      active_users_7d: activeSet.size,
      projects_created: projectsCreated,
      scripts_generated: scriptsGenerated,
      videos_generated: videosGenerated,
      exports_downloaded: exportsDownloaded,
      creator_packs_note:
        'Creator packs use profiles.exports_count (same as exports downloaded).',
    },
    growth: {
      new_users_today: newUsersToday,
      new_users_this_week: newUsersWeek,
      new_users_this_month: newUsersMonth,
    },
    usage: {
      top_templates: topCounts(templateCounts),
      top_niches: topCounts(nicheCounts),
      top_director_modes: topCounts(directorCounts),
      content_types: topCounts(contentTypeCounts),
    },
    retention: {
      returning_users: returningUsers,
      projects_per_user_avg: projectsPerUserAvg,
      avg_generations_per_user: Math.round(avgGenerations * 100) / 100,
    },
    feedback: {
      avg_rating: avgRating,
      total_feedback: await countExact(db, 'project_feedback').catch(() => fb.length),
      latest: fb.slice(0, 10).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
      feature_requests: featureRequests,
      founding_creator_applications: foundingAppsCount,
    },
    monetization: {
      upgrade_waitlist_total: upgradeWaitlistTotal,
      upgrade_waitlist_by_plan: topCounts(upgradeByPlan),
      referral_signups: referralSignups,
      revenue_validation: revenueValidation,
      tables_available: {
        upgrade_waitlist: upgradeAvailable,
        referrals: referralsAvailable,
      },
    },
    generated_at: now.toISOString(),
  }
}
