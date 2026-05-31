import { NextRequest, NextResponse } from 'next/server'
import { buildCeoBriefing } from '@/lib/agent/ceo-briefing'
import { loadCreatorAgentContext } from '@/lib/agent/agent-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { auth, ctx } = await loadCreatorAgentContext()
  if (auth.response) return auth.response
  if (!ctx) return NextResponse.json({ error: 'Context unavailable' }, { status: 500 })

  const useOpenAi = req.nextUrl.searchParams.get('openai') === '1'
  const briefing = await buildCeoBriefing(ctx, { useOpenAi })

  return NextResponse.json({ ok: true, briefing })
}
