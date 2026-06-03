import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExecutiveReview, FunnelStage } from '@/lib/business/types'
import {
  listBusinessInsights,
  listContentOutcomes,
  saveBusinessInsight,
} from '@/lib/business/business-memory'
import { buildBusinessKnowledgeGraph, funnelStageCounts } from '@/lib/business/knowledge-graph'
import { listLeads } from '@/lib/business/business-memory'
import { totalRevenueInr } from '@/lib/business/revenue-engine'
import { searchAssets } from '@/lib/assets/asset-search'

function weekStart(d = new Date()): string {
  const copy = new Date(d)
  const day = copy.getUTCDay()
  const diff = copy.getUTCDate() - day + (day === 0 ? -6 : 1)
  copy.setUTCDate(diff)
  return copy.toISOString().slice(0, 10)
}

export async function buildWeeklyReport(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  weekOf: string
  worked: string[]
  failed: string[]
  summary: string
}> {
  const weekOf = weekStart()
  const [assets, outcomes, leads, revenueInr] = await Promise.all([
    searchAssets(supabase, userId, { limit: 10 })
      .then((r) => r.assets)
      .catch(() => []),
    listContentOutcomes(supabase, userId, 20),
    listLeads(supabase, userId, 10),
    totalRevenueInr(supabase, userId),
  ])

  const worked: string[] = []
  const failed: string[] = []

  if (assets.length > 0) {
    worked.push(`${assets.length} assets in library — "${assets[0]?.title}" is recent top content`)
  } else {
    failed.push('No indexed creative assets — publish or export to feed the funnel')
  }

  if (leads.filter((l) => l.score >= 60).length > 0) {
    worked.push(`${leads.filter((l) => l.score >= 60).length} high-score leads in pipeline`)
  } else {
    failed.push('No qualified leads yet — add CTAs on consideration-stage content')
  }

  if (revenueInr > 0) {
    worked.push(`₹${revenueInr.toLocaleString('en-IN')} revenue logged this period`)
  } else {
    failed.push('Revenue funnel empty — log first sale or booking')
  }

  const funnel = funnelStageCounts(outcomes)
  const topStage = (Object.entries(funnel) as [FunnelStage, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0]
  if (topStage?.[1]) {
    worked.push(`Strongest funnel activity: ${topStage[0]} (${topStage[1]} outcomes)`)
  }

  const summary = `Week of ${weekOf}: ${worked.length} wins, ${failed.length} gaps to close.`

  await saveBusinessInsight(supabase, userId, {
    insightType: 'weekly_report',
    weekOf,
    payload: { worked, failed, summary, revenueInr },
  })

  return { weekOf, worked, failed, summary }
}

export async function getCachedWeeklyInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<{ worked: string[]; failed: string[] } | null> {
  const rows = await listBusinessInsights(supabase, userId, 'weekly_report', 1)
  const p = rows[0]?.payload
  if (!p) return null
  return {
    worked: Array.isArray(p.worked) ? (p.worked as string[]) : [],
    failed: Array.isArray(p.failed) ? (p.failed as string[]) : [],
  }
}

export async function syncContentPerformance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const assets = await searchAssets(supabase, userId, { limit: 15 })
    .then((r) => r.assets)
    .catch(() => [])
  let synced = 0
  for (const asset of assets) {
    const score = 40 + Math.min(40, asset.tags.length * 8)
    await supabase.from('content_outcomes').insert({
      user_id: userId,
      content_asset_id: asset.id,
      project_id: asset.project,
      funnel_stage: score > 70 ? 'consideration' : 'awareness',
      engagement_score: score,
      metadata: { syncedFrom: 'asset_os', title: asset.title },
    })
    synced += 1
  }
  return synced
}

export async function executiveReviewPayload(
  supabase: SupabaseClient,
  userId: string,
  mode: 'coo' | 'growth' = 'coo'
): Promise<ExecutiveReview> {
  const weekOf = weekStart()
  const report = await buildWeeklyReport(supabase, userId)
  await buildBusinessKnowledgeGraph(supabase, userId)
  const revenueInr = await totalRevenueInr(supabase, userId)
  const leads = await listLeads(supabase, userId, 30)
  const funnelSummary = funnelStageCounts(leads)

  const priorities =
    mode === 'coo'
      ? [
          'Ship one conversion-stage asset with priced CTA',
          'Review top 3 leads and assign nurture follow-ups',
          'Align weekly content plan to revenue goal',
        ]
      : [
          'Expand awareness with 2 reel hooks',
          'Repurpose top asset to consideration funnel',
          'Test one new audience segment',
        ]

  return {
    weekOf,
    headline:
      mode === 'coo'
        ? `COO review — week of ${weekOf}`
        : `Growth review — week of ${weekOf}`,
    priorities,
    risks: report.failed.length
      ? report.failed
      : ['Pipeline thin — increase publishing cadence'],
    opportunities: [
      'Campaign from latest high-performing export',
      'Partnership outreach to warm leads',
    ],
    worked: report.worked,
    failed: report.failed,
    funnelSummary,
    revenueInr,
    recommendedActions: priorities,
    mode,
  }
}
