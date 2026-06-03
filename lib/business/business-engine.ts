import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExecutiveReview } from '@/lib/business/types'
import { getOrCreateBusinessTwin } from '@/lib/business/business-memory'
import { suggestGrowthStrategy } from '@/lib/business/growth-engine'
import { captureLeadFromContent, nurtureLeads, topOpportunities } from '@/lib/business/lead-engine'
import { analyzeMonetization } from '@/lib/business/revenue-engine'
import { recommendDecisions } from '@/lib/business/decision-engine'
import { detectOpportunities } from '@/lib/business/opportunity-engine'
import {
  executiveReviewPayload,
  buildWeeklyReport,
  syncContentPerformance,
} from '@/lib/business/insights-engine'
import { buildBusinessKnowledgeGraph } from '@/lib/business/knowledge-graph'
import { ensureDefaultAudienceSegments } from '@/lib/business/audience-engine'
import { runGrowthAgent } from '@/lib/business/agents/growth-agent'
import { runLeadAgent } from '@/lib/business/agents/lead-agent'
import { runClientAgent } from '@/lib/business/agents/client-agent'
import { runRevenueAgent } from '@/lib/business/agents/revenue-agent'
import { runDecisionAgent } from '@/lib/business/agents/decision-agent'

export type BusinessEngineContext = {
  supabase: SupabaseClient
  userId: string
  goal?: string
  brandId?: string | null
}

export function createBusinessEngine(supabase: SupabaseClient, userId: string) {
  const ctx: BusinessEngineContext = { supabase, userId }

  return {
    async bootstrap() {
      const twin = await getOrCreateBusinessTwin(supabase, userId)
      await ensureDefaultAudienceSegments(supabase, userId)
      return twin
    },

    async helpMeGrow(command: string) {
      await this.bootstrap()
      const strategy = await suggestGrowthStrategy(supabase, userId, command)
      const decisions = await recommendDecisions(supabase, userId, command)
      const agent = runGrowthAgent({ goal: command, strategy, decisions })
      return {
        twin: await getOrCreateBusinessTwin(supabase, userId),
        strategy,
        decisions,
        agent,
      }
    },

    async actAsCoo() {
      await this.bootstrap()
      const review = await executiveReviewPayload(supabase, userId, 'coo')
      const decisions = await recommendDecisions(supabase, userId, 'executive priorities')
      const agent = runDecisionAgent({ review, decisions })
      return { review, decisions, agent }
    },

    async executiveReview(mode: 'coo' | 'growth' = 'coo'): Promise<ExecutiveReview> {
      await syncContentPerformance(supabase, userId).catch(() => 0)
      return executiveReviewPayload(supabase, userId, mode)
    },

    async weeklyInsights() {
      return buildWeeklyReport(supabase, userId)
    },

    async knowledgeGraph() {
      return buildBusinessKnowledgeGraph(supabase, userId)
    },

    async onContentDrop(input: {
      projectId?: string
      contentAssetId?: string
      engagementScore?: number
    }) {
      const lead = await captureLeadFromContent(supabase, userId, input)
      const monetization = await analyzeMonetization(supabase, userId)
      const growth = await suggestGrowthStrategy(
        supabase,
        userId,
        'campaign from content drop'
      )
      return {
        lead,
        campaignSuggestion: growth.recommendations[0],
        monetization: monetization.recommendations[0],
      }
    },

    async runLeadPipeline() {
      return runLeadAgent({ supabase, userId, leads: await topOpportunities(supabase, userId) })
    },

    async runClientFlow() {
      return runClientAgent({ supabase, userId })
    },

    async runRevenueAnalysis() {
      return runRevenueAgent({ supabase, userId })
    },

    async runOpportunityScan(goal?: string) {
      return detectOpportunities(supabase, userId, goal)
    },

    async nurture() {
      return nurtureLeads(supabase, userId)
    },

    ctx,
  }
}

export type BusinessEngine = ReturnType<typeof createBusinessEngine>

/** Parse Cmd+K / agent commands for business OS */
export function parseBusinessCommand(command: string): {
  kind: 'grow' | 'coo' | 'leads' | 'revenue' | 'generic'
  text: string
} | null {
  const t = command.trim()
  const lower = t.toLowerCase()
  if (/help me grow|grow mugtee|growth strategy/.test(lower)) {
    return { kind: 'grow', text: t }
  }
  if (/act as my coo|executive review|coo mode|weekly executive/.test(lower)) {
    return { kind: 'coo', text: t }
  }
  if (/lead|funnel|pipeline/.test(lower)) return { kind: 'leads', text: t }
  if (/revenue|monetiz|₹|inr|offer/.test(lower)) return { kind: 'revenue', text: t }
  if (/business os|business twin/.test(lower)) return { kind: 'generic', text: t }
  return null
}
