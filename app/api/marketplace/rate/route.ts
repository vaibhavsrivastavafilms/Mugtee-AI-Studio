import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { rateMarketplaceAgent } from '@/lib/marketplace/agent-rating'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const agentSlug = String(b.agentSlug ?? '').trim()
  const rating = Number(b.rating)
  if (!agentSlug) {
    return NextResponse.json({ error: 'agentSlug required' }, { status: 400 })
  }

  const row = await rateMarketplaceAgent(
    auth.supabase,
    auth.user!.id,
    agentSlug,
    rating,
    typeof b.review === 'string' ? b.review : undefined
  )
  return NextResponse.json({ ok: true, rating: row })
}
