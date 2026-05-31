import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import { analyzeCompetitors } from '@/lib/agent/competitor-intelligence'
import { buildAgentContext } from '@/lib/agent/agent-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data: competitors } = await auth.supabase
    .from('creator_competitors')
    .select('*')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await auth.supabase
    .from('creator_profiles')
    .select('niche, platform, content_style, creator_goal, creator_dna, memory_graph, learning_events')
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const ctx = buildAgentContext(auth.user!.id, profile)
  const insights = analyzeCompetitors(
    ctx,
    (competitors ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      channel_url: c.channel_url,
      platform: c.platform,
      notes: c.notes,
      metadata: typeof c.metadata === 'object' ? (c.metadata as Record<string, unknown>) : {},
    }))
  )

  return NextResponse.json({
    ok: true,
    competitors: competitors ?? [],
    insights,
    stubbed: { liveScraping: false, patternSource: 'templates' },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const name = typeof parsed.body!.name === 'string' ? parsed.body!.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('creator_competitors')
    .insert({
      user_id: auth.user!.id,
      name,
      channel_url: typeof parsed.body!.channel_url === 'string' ? parsed.body!.channel_url : null,
      platform: typeof parsed.body!.platform === 'string' ? parsed.body!.platform : null,
      notes: typeof parsed.body!.notes === 'string' ? parsed.body!.notes : null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, competitor: data })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  await auth.supabase
    .from('creator_competitors')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user!.id)

  return NextResponse.json({ ok: true })
}
