import {
  FeatureUsageFeatures,
  type FeatureUsageFeature,
} from '@/lib/analytics/feature-usage'

export type FeatureUsageCount = { feature: string; count: number }

export type FeatureUsageWeeklyPoint = {
  week_start: string
  feature: string
  count: number
}

export type FeatureRetentionProxy = {
  feature: string
  users_total: number
  users_returned: number
  retention_pct: number
}

export type FeatureUsageIntelligenceMetrics = {
  generated_at: string
  window_days: number
  table_available: boolean
  most_used_features: FeatureUsageCount[]
  least_used_features: FeatureUsageCount[]
  weekly_trends: FeatureUsageWeeklyPoint[]
  retention_proxy: FeatureRetentionProxy[]
}

const ALL_FEATURES: FeatureUsageFeature[] = Object.values(FeatureUsageFeatures)

type UsageRow = {
  user_id: string | null
  feature: string
  project_id: string | null
  created_at: string
}

function utcWeekStart(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
  return monday.toISOString().slice(0, 10)
}

function utcDay(iso: string): string {
  return iso.slice(0, 10)
}

function userReturnedForFeature(events: UsageRow[]): boolean {
  const projectIds = new Set<string>()
  const days = new Set<string>()
  for (const e of events) {
    if (e.project_id) projectIds.add(e.project_id)
    days.add(utcDay(e.created_at))
  }
  return projectIds.size >= 2 || days.size >= 2
}

export function computeFeatureUsageIntelligenceMetrics(
  rows: UsageRow[],
  windowDays: number,
  tableAvailable: boolean
): FeatureUsageIntelligenceMetrics {
  const counts: Record<string, number> = {}
  for (const f of ALL_FEATURES) counts[f] = 0
  for (const row of rows) {
    if (!row.feature) continue
    counts[row.feature] = (counts[row.feature] || 0) + 1
  }

  const ranked = ALL_FEATURES.map((feature) => ({
    feature,
    count: counts[feature] || 0,
  })).sort((a, b) => b.count - a.count)

  const most_used_features = ranked.filter((r) => r.count > 0)
  const least_used_features = [...ranked].sort((a, b) => a.count - b.count)

  const weeklyMap = new Map<string, number>()
  for (const row of rows) {
    const week = utcWeekStart(row.created_at)
    const key = `${week}|${row.feature}`
    weeklyMap.set(key, (weeklyMap.get(key) || 0) + 1)
  }
  const weekly_trends: FeatureUsageWeeklyPoint[] = [...weeklyMap.entries()]
    .map(([key, count]) => {
      const [week_start, feature] = key.split('|')
      return { week_start, feature, count }
    })
    .sort((a, b) => a.week_start.localeCompare(b.week_start) || a.feature.localeCompare(b.feature))

  const byFeatureUser = new Map<string, Map<string, UsageRow[]>>()
  for (const row of rows) {
    if (!row.user_id || !row.feature) continue
    if (!byFeatureUser.has(row.feature)) byFeatureUser.set(row.feature, new Map())
    const perUser = byFeatureUser.get(row.feature)!
    const list = perUser.get(row.user_id) || []
    list.push(row)
    perUser.set(row.user_id, list)
  }

  const retention_proxy: FeatureRetentionProxy[] = ALL_FEATURES.map((feature) => {
    const perUser = byFeatureUser.get(feature)
    if (!perUser || perUser.size === 0) {
      return { feature, users_total: 0, users_returned: 0, retention_pct: 0 }
    }
    let users_returned = 0
    for (const events of perUser.values()) {
      if (userReturnedForFeature(events)) users_returned += 1
    }
    const users_total = perUser.size
    const retention_pct =
      users_total > 0 ? Math.round((users_returned / users_total) * 1000) / 10 : 0
    return { feature, users_total, users_returned, retention_pct }
  })

  return {
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    table_available: tableAvailable,
    most_used_features,
    least_used_features,
    weekly_trends,
    retention_proxy,
  }
}
