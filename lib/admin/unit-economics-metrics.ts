import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  estimateExportCostUsd,
  estimateGenerationCostUsd,
  estimateMonthlyCogsUsd,
  grossMarginPct,
  UNIT_COST_USD,
} from '@/lib/economics/cost-estimates'
import {
  getEconomicsCreatorLimits,
  getEconomicsFreeLimits,
  getEconomicsProLimits,
  getEconomicsStudioLimits,
  PLAN_PRICE_INR,
  type MugteePlanTier,
} from '@/lib/economics/plan-economics'

export type UnitEconomicsDashboard = {
  unitCosts: typeof UNIT_COST_USD
  estimates: {
    draft60sGenerationUsd: number
    creator60sGenerationUsd: number
    creator60sExportUsd: number
    creator60sTotalUsd: number
  }
  usage30d: {
    generations: number
    exports: number
    activeUsers: number
    estimatedCogsUsd: number
  }
  exportJobs: {
    total: number
    failed: number
    avgRenderSeconds: number | null
    avgCostEstimateUsd: number | null
    retryBlocked: number
  }
  planEconomics: Array<{
    tier: MugteePlanTier
    priceInr: number
    limits: ReturnType<typeof getEconomicsFreeLimits>
    maxMonthlyCogsUsd: number
    grossMarginPctAtCap: number
  }>
  providerSpendProxy: {
    openaiProxyUsd: number
    perplexityProxyUsd: number
    runwayProxyUsd: number
  }
}

function tierLimits(tier: MugteePlanTier) {
  switch (tier) {
    case 'CREATOR':
      return getEconomicsCreatorLimits()
    case 'PRO':
    case 'PRO_TRIAL':
      return getEconomicsProLimits()
    case 'STUDIO':
      return getEconomicsStudioLimits()
    default:
      return getEconomicsFreeLimits()
  }
}

export async function computeUnitEconomicsDashboard(): Promise<UnitEconomicsDashboard> {
  const service = createSupabaseServiceClient()

  let generations30d = 0
  let exports30d = 0
  let activeUsers = 0

  if (service) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: genCount } = await service
      .from('profiles')
      .select('generations_count', { count: 'exact', head: true })
    generations30d = genCount ?? 0

    const { data: profiles } = await service
      .from('profiles')
      .select('generations_count, exports_count, renders_count')
    if (profiles?.length) {
      activeUsers = profiles.filter(
        (p) =>
          (p.generations_count ?? 0) > 0 ||
          (p.exports_count ?? 0) > 0 ||
          (p.renders_count ?? 0) > 0
      ).length
      generations30d = profiles.reduce((s, p) => s + (p.generations_count ?? 0), 0)
      exports30d = profiles.reduce((s, p) => s + (p.exports_count ?? 0), 0)
    }

    void since
  }

  let exportJobStats = {
    total: 0,
    failed: 0,
    avgRenderSeconds: null as number | null,
    avgCostEstimateUsd: null as number | null,
    retryBlocked: 0,
  }

  if (service) {
    const { data: jobs } = await service
      .from('export_jobs')
      .select('status, render_seconds, cost_estimate_usd, retry_count')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (jobs?.length) {
      exportJobStats.total = jobs.length
      exportJobStats.failed = jobs.filter((j) => j.status === 'failed').length
      exportJobStats.retryBlocked = jobs.filter((j) => (j.retry_count ?? 0) >= 2).length
      const renderSecs = jobs
        .map((j) => Number(j.render_seconds))
        .filter((n) => Number.isFinite(n) && n > 0)
      const costs = jobs
        .map((j) => Number(j.cost_estimate_usd))
        .filter((n) => Number.isFinite(n) && n > 0)
      if (renderSecs.length) {
        exportJobStats.avgRenderSeconds =
          Math.round((renderSecs.reduce((a, b) => a + b, 0) / renderSecs.length) * 10) / 10
      }
      if (costs.length) {
        exportJobStats.avgCostEstimateUsd =
          Math.round((costs.reduce((a, b) => a + b, 0) / costs.length) * 1000) / 1000
      }
    }
  }

  const creatorGen = estimateGenerationCostUsd({
    sceneCount: 8,
    mode: 'creator',
    researchLive: false,
    voiceElevenLabs: false,
  })
  const draftGen = estimateGenerationCostUsd({
    sceneCount: 8,
    mode: 'draft',
    researchLive: false,
    voiceElevenLabs: false,
  })
  const export60 = estimateExportCostUsd(60)

  const estimatedCogsUsd = estimateMonthlyCogsUsd({
    generations: generations30d,
    exports: exports30d,
    avgGenerationUsd: creatorGen,
    avgExportUsd: export60,
  })

  const tiers: MugteePlanTier[] = ['FREE', 'CREATOR', 'PRO', 'STUDIO']
  const planEconomics = tiers.map((tier) => {
    const limits = tierLimits(tier)
    const maxCogs = estimateMonthlyCogsUsd({
      generations: limits.generations,
      exports: limits.exports,
      avgGenerationUsd: creatorGen,
      avgExportUsd: export60,
    })
    return {
      tier,
      priceInr: PLAN_PRICE_INR[tier],
      limits,
      maxMonthlyCogsUsd: maxCogs,
      grossMarginPctAtCap: grossMarginPct(PLAN_PRICE_INR[tier], maxCogs),
    }
  })

  return {
    unitCosts: UNIT_COST_USD,
    estimates: {
      draft60sGenerationUsd: draftGen,
      creator60sGenerationUsd: creatorGen,
      creator60sExportUsd: export60,
      creator60sTotalUsd: Math.round((creatorGen + export60) * 1000) / 1000,
    },
    usage30d: {
      generations: generations30d,
      exports: exports30d,
      activeUsers,
      estimatedCogsUsd,
    },
    exportJobs: exportJobStats,
    planEconomics,
    providerSpendProxy: {
      openaiProxyUsd: Math.round(generations30d * 0.12 * 100) / 100,
      perplexityProxyUsd: Math.round(generations30d * 0.04 * 100) / 100,
      runwayProxyUsd: 0,
    },
  }
}
