import { NextResponse } from 'next/server'
import { buildSmartSuggestions } from '@/lib/agent/smart-suggestions'
import { loadCreatorAgentContext } from '@/lib/agent/agent-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { auth, ctx } = await loadCreatorAgentContext()
  if (auth.response) return auth.response
  if (!ctx) return NextResponse.json({ error: 'Context unavailable' }, { status: 500 })

  const suggestions = buildSmartSuggestions(ctx)
  return NextResponse.json({ ok: true, suggestions })
}
