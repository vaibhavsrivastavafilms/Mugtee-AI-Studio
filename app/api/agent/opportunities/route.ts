import { NextResponse } from 'next/server'
import { buildDailyOpportunityFeed } from '@/lib/agent/content-opportunity-feed'
import { loadCreatorAgentContext, todayDate } from '@/lib/agent/agent-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { auth, ctx } = await loadCreatorAgentContext()
  if (auth.response) return auth.response
  if (!ctx) return NextResponse.json({ error: 'Context unavailable' }, { status: 500 })

  const feedDate = todayDate()
  const { sections, items } = buildDailyOpportunityFeed(ctx, feedDate)

  const rows = items.map((item) => ({
    user_id: auth.user!.id,
    title: item.title,
    type: item.type,
    description: item.description ?? item.why ?? null,
    opportunity_score: item.opportunityScore,
    competition_score: item.competitionScore,
    viral_potential: item.viralPotential,
    payload: { why: item.why, how: item.how, format: item.format, topic: item.topic },
    feed_date: feedDate,
  }))

  await auth.supabase.from('creator_opportunities').delete().eq('user_id', auth.user!.id).eq('feed_date', feedDate)
  if (rows.length) {
    await auth.supabase.from('creator_opportunities').insert(rows)
  }

  const { data: cached } = await auth.supabase
    .from('creator_opportunities')
    .select('*')
    .eq('user_id', auth.user!.id)
    .eq('feed_date', feedDate)
    .order('opportunity_score', { ascending: false })

  return NextResponse.json({
    ok: true,
    feedDate,
    sections,
    items: (cached ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      description: r.description,
      opportunityScore: r.opportunity_score,
      competitionScore: r.competition_score,
      viralPotential: r.viral_potential,
      ...(typeof r.payload === 'object' && r.payload ? r.payload : {}),
    })),
    stubbed: { trends: true, liveScraping: false },
  })
}
