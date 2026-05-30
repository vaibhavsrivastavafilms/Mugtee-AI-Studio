import type { SupabaseClient } from '@supabase/supabase-js'
import { topCounts, type RankedCount } from '@/lib/admin/founder-dashboard-metrics'

export type FeatureRetentionRow = {
  feature: string
  usage_count: number
  users_total: number
  users_retained_d7: number
  users_retained_d30: number
  d7_retention_pct: number
  d30_retention_pct: number
}

export type FeatureRevenueRow = {
  feature: string
  waitlist_users_used: number
  waitlist_users_total: number
  waitlist_user_pct: number
}

export type FounderInsight = {
  id: string
  title: string
  feature: string
  value: string
  detail: string
}

export type GrowthSignalsMetrics = {
  generated_at: string
  window_days: number
  tables_available: {
    feature_usage_events: boolean
    upgrade_waitlist: boolean
  }
  most_used_features: RankedCount[]
  highest_retention_features: Array<{ feature: string; d7_pct: number; d30_pct: number }>
  highest_revenue_features: FeatureRevenueRow[]
  most_used_templates: RankedCount[]
  most_used_niches: RankedCount[]
  retention_analysis: FeatureRetentionRow[]
  revenue: {
    features_before_waitlist_7d: RankedCount[]
    features_after_upgrade: RankedCount[]
    top_paying_segments: RankedCount[]
    pro_users_count: number
    waitlist_proxy_used: boolean
  }
  founder_insights: FounderInsight[]
}

type UsageEvent = {
  user_id: string | null
  feature: string
  created_at: string
}

type ProjectActivity = {
  user_id: string | null
  created_at: string
  updated_at: string
}

type WaitlistRow = {
  user_id: string | null
  plan_interest: string
  created_at: string
}

const MS_DAY = 24 * 60 * 60 * 1000

function bump(map: Record<string, number>, key: string | null | undefined) {
  const k = (key || '').trim() || 'unknown'
  map[k] = (map[k] || 0) + 1
}

function parseCaptionsFields(captions: unknown): { blueprintId?: string; niche?: string } {
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
  }
}

async function tableExists(db: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('*', { count: 'exact', head: true }).limit(1)
  if (!error) return true
  const msg = (error.message || '').toLowerCase()
  return !(msg.includes('does not exist') || msg.includes('relation') || error.code === '42P01')
}

function buildUserActivityTimestamps(
  events: UsageEvent[],
  projects: ProjectActivity[]
): Map<string, number[]> {
  const byUser = new Map<string, number[]>()
  const add = (userId: string | null | undefined, iso: string) => {
    if (!userId) return
    const ts = new Date(iso).getTime()
    if (Number.isNaN(ts)) return
    const list = byUser.get(userId) || []
    list.push(ts)
    byUser.set(userId, list)
  }
  for (const e of events) add(e.user_id, e.created_at)
  for (const p of projects) {
    add(p.user_id, p.created_at)
    if (p.updated_at !== p.created_at) add(p.user_id, p.updated_at)
  }
  for (const [uid, list] of byUser) {
    list.sort((a, b) => a - b)
    byUser.set(uid, list)
  }
  return byUser
}

function userRetainedAfterFirstUse(
  activityTimestamps: number[],
  firstUseMs: number,
  minDaysAfter: number
): boolean {
  const threshold = firstUseMs + minDaysAfter * MS_DAY
  return activityTimestamps.some((ts) => ts >= threshold)
}

function computeFeatureRetention(
  events: UsageEvent[],
  activityByUser: Map<string, number[]>,
  sinceMs: number
): FeatureRetentionRow[] {
  const usageCounts: Record<string, number> = {}
  const firstUseByFeatureUser = new Map<string, Map<string, number>>()

  for (const row of events) {
    if (!row.user_id || !row.feature) continue
    const ts = new Date(row.created_at).getTime()
    if (Number.isNaN(ts)) continue

    if (ts >= sinceMs) {
      usageCounts[row.feature] = (usageCounts[row.feature] || 0) + 1
    }

    if (!firstUseByFeatureUser.has(row.feature)) {
      firstUseByFeatureUser.set(row.feature, new Map())
    }
    const perUser = firstUseByFeatureUser.get(row.feature)!
    const prev = perUser.get(row.user_id)
    if (prev === undefined || ts < prev) perUser.set(row.user_id, ts)
  }

  const now = Date.now()
  const rows: FeatureRetentionRow[] = []

  for (const [feature, perUser] of firstUseByFeatureUser) {
    let users_retained_d7 = 0
    let users_retained_d30 = 0
    let eligible_d7 = 0
    let eligible_d30 = 0

    for (const [userId, firstUseMs] of perUser) {
      const activity = activityByUser.get(userId) || []
      if (now - firstUseMs >= 7 * MS_DAY) {
        eligible_d7 += 1
        if (userRetainedAfterFirstUse(activity, firstUseMs, 7)) users_retained_d7 += 1
      }
      if (now - firstUseMs >= 30 * MS_DAY) {
        eligible_d30 += 1
        if (userRetainedAfterFirstUse(activity, firstUseMs, 30)) users_retained_d30 += 1
      }
    }

    const users_total = perUser.size
    rows.push({
      feature,
      usage_count: usageCounts[feature] || 0,
      users_total,
      users_retained_d7,
      users_retained_d30,
      d7_retention_pct:
        eligible_d7 > 0 ? Math.round((users_retained_d7 / eligible_d7) * 1000) / 10 : 0,
      d30_retention_pct:
        eligible_d30 > 0 ? Math.round((users_retained_d30 / eligible_d30) * 1000) / 10 : 0,
    })
  }

  return rows.sort((a, b) => b.usage_count - a.usage_count)
}

function computeWaitlistFeatureCorrelation(
  events: UsageEvent[],
  waitlistUsers: Set<string>
): FeatureRevenueRow[] {
  const featuresByWaitlistUser = new Map<string, Set<string>>()
  for (const row of events) {
    if (!row.user_id || !row.feature || !waitlistUsers.has(row.user_id)) continue
    if (!featuresByWaitlistUser.has(row.user_id)) {
      featuresByWaitlistUser.set(row.user_id, new Set())
    }
    featuresByWaitlistUser.get(row.user_id)!.add(row.feature)
  }

  const featureUserCounts: Record<string, number> = {}
  for (const features of featuresByWaitlistUser.values()) {
    for (const f of features) {
      featureUserCounts[f] = (featureUserCounts[f] || 0) + 1
    }
  }

  const total = waitlistUsers.size
  return Object.entries(featureUserCounts)
    .map(([feature, waitlist_users_used]) => ({
      feature,
      waitlist_users_used,
      waitlist_users_total: total,
      waitlist_user_pct:
        total > 0 ? Math.round((waitlist_users_used / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.waitlist_user_pct - a.waitlist_user_pct)
}

function computeFeaturesBeforeWaitlist(
  events: UsageEvent[],
  waitlistRows: WaitlistRow[]
): RankedCount[] {
  const counts: Record<string, number> = {}
  for (const wl of waitlistRows) {
    if (!wl.user_id) continue
    const waitlistMs = new Date(wl.created_at).getTime()
    if (Number.isNaN(waitlistMs)) continue
    const windowStart = waitlistMs - 7 * MS_DAY
    for (const e of events) {
      if (e.user_id !== wl.user_id || !e.feature) continue
      const ts = new Date(e.created_at).getTime()
      if (ts >= windowStart && ts < waitlistMs) bump(counts, e.feature)
    }
  }
  return topCounts(counts, 15)
}

function computeFeaturesAfterUpgrade(
  events: UsageEvent[],
  userIds: Set<string>,
  afterByUser: Map<string, number>
): RankedCount[] {
  const counts: Record<string, number> = {}
  for (const e of events) {
    if (!e.user_id || !e.feature || !userIds.has(e.user_id)) continue
    const afterMs = afterByUser.get(e.user_id)
    if (afterMs === undefined) continue
    const ts = new Date(e.created_at).getTime()
    if (ts >= afterMs) bump(counts, e.feature)
  }
  return topCounts(counts, 15)
}

export async function computeGrowthSignals(
  db: SupabaseClient,
  windowDays = 30
): Promise<GrowthSignalsMetrics> {
  const now = new Date()
  const sinceMs = now.getTime() - windowDays * MS_DAY
  const sinceIso = new Date(sinceMs).toISOString()

  const [featureTableOk, waitlistTableOk] = await Promise.all([
    tableExists(db, 'feature_usage_events'),
    tableExists(db, 'upgrade_waitlist'),
  ])

  let events: UsageEvent[] = []
  if (featureTableOk) {
    const { data, error } = await db
      .from('feature_usage_events')
      .select('user_id, feature, created_at')
      .limit(100_000)
    if (!error) events = data || []
  }

  const windowEvents = events.filter((e) => new Date(e.created_at).getTime() >= sinceMs)
  const usageCounts: Record<string, number> = {}
  for (const e of windowEvents) bump(usageCounts, e.feature)
  const most_used_features = topCounts(usageCounts, 15)

  const { data: projectRows } = await db
    .from('cinematic_projects')
    .select('user_id, captions, created_at, updated_at')
    .limit(15000)

  const projects: ProjectActivity[] = (projectRows || []).map((r) => ({
    user_id: r.user_id as string | null,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string) || (r.created_at as string),
  }))

  const templateCounts: Record<string, number> = {}
  const nicheCounts: Record<string, number> = {}
  for (const row of projectRows || []) {
    const caps = parseCaptionsFields(row.captions)
    bump(templateCounts, caps.blueprintId ?? 'none')
    bump(nicheCounts, caps.niche)
  }
  const most_used_templates = topCounts(templateCounts, 15)
  const most_used_niches = topCounts(nicheCounts, 15)

  const activityByUser = buildUserActivityTimestamps(events, projects)
  const retention_analysis = featureTableOk
    ? computeFeatureRetention(events, activityByUser, sinceMs)
    : []

  const highest_retention_features = [...retention_analysis]
    .filter((r) => r.users_total >= 3)
    .sort((a, b) => b.d30_retention_pct - a.d30_retention_pct)
    .slice(0, 10)
    .map((r) => ({ feature: r.feature, d7_pct: r.d7_retention_pct, d30_pct: r.d30_retention_pct }))

  let waitlistRows: WaitlistRow[] = []
  let highest_revenue_features: FeatureRevenueRow[] = []
  let features_before_waitlist_7d: RankedCount[] = []
  let features_after_upgrade: RankedCount[] = []
  let top_paying_segments: RankedCount[] = []
  let pro_users_count = 0
  let waitlist_proxy_used = false

  if (waitlistTableOk) {
    const { data: wlData } = await db
      .from('upgrade_waitlist')
      .select('user_id, plan_interest, created_at')
      .limit(5000)
    waitlistRows = wlData || []

    const waitlistUserIds = new Set<string>()
    for (const row of waitlistRows) {
      if (row.user_id) waitlistUserIds.add(row.user_id)
    }

    if (featureTableOk && waitlistUserIds.size > 0) {
      highest_revenue_features = computeWaitlistFeatureCorrelation(events, waitlistUserIds)
      features_before_waitlist_7d = computeFeaturesBeforeWaitlist(events, waitlistRows)
    }

    const { data: proProfiles } = await db
      .from('profiles')
      .select('id, plan_type, updated_at')
      .in('plan_type', ['PRO', 'CREATOR', 'PRO_TRIAL'])
      .limit(5000)

    const proUsers = proProfiles || []
    pro_users_count = proUsers.length

    if (featureTableOk) {
      if (pro_users_count > 0) {
        const proIds = new Set(proUsers.map((p) => p.id as string))
        const afterByUser = new Map<string, number>()
        for (const p of proUsers) {
          const updated = new Date((p.updated_at as string) || now.toISOString()).getTime()
          afterByUser.set(p.id as string, updated - 30 * MS_DAY)
        }
        features_after_upgrade = computeFeaturesAfterUpgrade(events, proIds, afterByUser)
      } else if (waitlistUserIds.size > 0) {
        waitlist_proxy_used = true
        const afterByUser = new Map<string, number>()
        for (const wl of waitlistRows) {
          if (!wl.user_id) continue
          afterByUser.set(wl.user_id, new Date(wl.created_at).getTime())
        }
        features_after_upgrade = computeFeaturesAfterUpgrade(events, waitlistUserIds, afterByUser)
      }
    }

    const segmentCounts: Record<string, number> = {}
    const { data: foundingApps } = await db
      .from('founding_creator_applications')
      .select('user_id, creator_type')
      .limit(5000)

    const creatorTypeByUser = new Map<string, string>()
    for (const app of foundingApps || []) {
      if (app.user_id && app.creator_type) {
        creatorTypeByUser.set(app.user_id, app.creator_type)
      }
    }

    for (const wl of waitlistRows) {
      if (!wl.user_id) continue
      const creatorType = creatorTypeByUser.get(wl.user_id) || 'unknown_creator'
      const segment = `${creatorType} · ${wl.plan_interest}`
      bump(segmentCounts, segment)
    }
    top_paying_segments = topCounts(segmentCounts, 12)
  }

  const founder_insights: FounderInsight[] = []

  const topRetention = retention_analysis
    .filter((r) => r.users_total >= 3 && r.d30_retention_pct > 0)
    .sort((a, b) => b.d30_retention_pct - a.d30_retention_pct)[0]
  if (topRetention) {
    founder_insights.push({
      id: 'retention',
      title: 'Feature Most Correlated With Retention',
      feature: topRetention.feature,
      value: `${topRetention.d30_retention_pct}%`,
      detail: `D30 retention among ${topRetention.users_total} users who used ${topRetention.feature.replace(/_/g, ' ')} (eligible cohort ≥30d since first use).`,
    })
  }

  const topUpgrade = highest_revenue_features[0]
  if (topUpgrade && topUpgrade.waitlist_users_total > 0) {
    founder_insights.push({
      id: 'upgrade_intent',
      title: 'Feature Most Correlated With Upgrade Intent',
      feature: topUpgrade.feature,
      value: `${topUpgrade.waitlist_user_pct}%`,
      detail: `${topUpgrade.waitlist_users_used} of ${topUpgrade.waitlist_users_total} waitlist users used this feature.`,
    })
  }

  return {
    generated_at: now.toISOString(),
    window_days: windowDays,
    tables_available: {
      feature_usage_events: featureTableOk,
      upgrade_waitlist: waitlistTableOk,
    },
    most_used_features,
    highest_retention_features,
    highest_revenue_features: highest_revenue_features.slice(0, 10),
    most_used_templates,
    most_used_niches,
    retention_analysis,
    revenue: {
      features_before_waitlist_7d,
      features_after_upgrade,
      top_paying_segments,
      pro_users_count,
      waitlist_proxy_used,
    },
    founder_insights,
  }
}
